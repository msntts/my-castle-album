import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";
import { ddb, getTableName } from "../shared/dynamodb";
import { s3Client, getPhotosBucketName, getCloudfrontDomain } from "../shared/s3";
import { requireAuth } from "../shared/auth";
import {
  badRequest,
  created,
  internalError,
  noContent,
  notFound,
  unauthorized,
} from "../shared/response";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function addPhoto(
  castleId: string,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  let body: { contentType?: unknown; caption?: unknown; fileName?: unknown };
  try {
    body = JSON.parse(event.body ?? "{}") as typeof body;
  } catch {
    return badRequest("Invalid JSON");
  }

  const contentType = body.contentType;
  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return badRequest("contentType must be image/jpeg, image/png, image/webp, or image/gif");
  }

  const caption =
    typeof body.caption === "string" && body.caption.trim() !== ""
      ? body.caption.trim()
      : undefined;

  const rawFileName = typeof body.fileName === "string" && body.fileName.trim() !== ""
    ? body.fileName.trim()
    : null;
  if (rawFileName !== null && rawFileName.length > 255) {
    return badRequest("fileName must be 255 characters or fewer");
  }
  const photoId = rawFileName ? encodeURIComponent(rawFileName) : ulid();
  const s3Key = `photos/${castleId}/${photoId}`;

  const PHOTOS_BUCKET_NAME = getPhotosBucketName();
  const CLOUDFRONT_DOMAIN = getCloudfrontDomain();
  const TABLE_NAME = getTableName();

  // Presigned URL 生成を先に行い、成功後にのみ DynamoDB に書き込む。
  // 逆順だと URL 生成失敗時にオーファンレコードが残る。
  const presignedUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: PHOTOS_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `CASTLE#${castleId}`,
        SK: `PHOTO#${photoId}`,
        ...(caption !== undefined ? { caption } : {}),
      },
    })
  );

  const imageUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  return created({ photoId, presignedUrl, imageUrl });
}

async function removePhoto(
  castleId: string,
  photoId: string
): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const PHOTOS_BUCKET_NAME = getPhotosBucketName();

  const { Attributes } = await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CASTLE#${castleId}`, SK: `PHOTO#${photoId}` },
      ReturnValues: "ALL_OLD",
    })
  );
  if (!Attributes) return notFound();

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: PHOTOS_BUCKET_NAME,
        Key: `photos/${castleId}/${photoId}`,
      })
    );
  } catch (err) {
    // S3 削除失敗は orphan として記録し、Phase 9-6 の定期クリーンアップで回収
    console.error("S3 object deletion failed, may be orphaned:", err);
  }

  return noContent();
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!requireAuth(event)) {
      return unauthorized();
    }

    const method = event.requestContext.http.method;
    const castleId = event.pathParameters?.castleId;
    const photoId = event.pathParameters?.photoId;

    if (method === "POST" && castleId) return addPhoto(castleId, event);
    if (method === "DELETE" && castleId && photoId) return removePhoto(castleId, photoId);

    return notFound();
  } catch (err) {
    return internalError(err);
  }
};
