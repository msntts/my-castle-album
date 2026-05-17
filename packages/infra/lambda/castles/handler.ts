import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  BatchWriteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { ddb, getTableName } from "../shared/dynamodb";
import { requireAuth } from "../shared/auth";
import {
  badRequest,
  created,
  internalError,
  noContent,
  notFound,
  ok,
  unauthorized,
} from "../shared/response";

interface CastleInput {
  name: unknown;
  latitude: unknown;
  longitude: unknown;
  thumbnailPhotoId?: unknown;
}

function parseBody(raw: string | undefined): CastleInput {
  try {
    return JSON.parse(raw ?? "{}") as CastleInput;
  } catch {
    return {} as CastleInput;
  }
}

function isValidBody(
  b: CastleInput
): b is { name: string; latitude: number; longitude: number } {
  return (
    typeof b.name === "string" &&
    b.name.trim() !== "" &&
    typeof b.latitude === "number" &&
    isFinite(b.latitude) &&
    typeof b.longitude === "number" &&
    isFinite(b.longitude)
  );
}

async function listCastles(): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const { Items = [] } = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "ALL_CASTLES" },
    })
  );
  return ok(
    Items.map((item) => ({
      castleId: (item.PK as string).replace("CASTLE#", ""),
      name: item.name as string,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      thumbnailPhotoId: item.thumbnailPhotoId as string | undefined,
    }))
  );
}

async function getCastle(castleId: string): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const { Items = [] } = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `CASTLE#${castleId}` },
    })
  );
  const metadata = Items.find((item) => item.SK === "METADATA");
  if (!metadata) return notFound();
  const photos = Items.filter((item) =>
    (item.SK as string).startsWith("PHOTO#")
  ).map((item) => ({
    photoId: (item.SK as string).replace("PHOTO#", ""),
    castleId,
    caption: item.caption as string | undefined,
  }));
  return ok({
    castleId,
    name: metadata.name as string,
    latitude: metadata.latitude as number,
    longitude: metadata.longitude as number,
    thumbnailPhotoId: metadata.thumbnailPhotoId as string | undefined,
    photos,
  });
}

async function createCastle(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const body = parseBody(event.body);
  if (!isValidBody(body)) {
    return badRequest("name (string), latitude (number), longitude (number) are required");
  }
  const castleId = ulid();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `CASTLE#${castleId}`,
        SK: "METADATA",
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        GSI1PK: "ALL_CASTLES",
        GSI1SK: `CASTLE#${castleId}`,
      },
    })
  );
  return created({ castleId, name: body.name, latitude: body.latitude, longitude: body.longitude });
}

async function updateCastle(
  castleId: string,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const body = parseBody(event.body);
  if (!isValidBody(body)) {
    return badRequest("name (string), latitude (number), longitude (number) are required");
  }
  const thumbnailPhotoId =
    typeof body.thumbnailPhotoId === "string" &&
    /^[A-Za-z0-9\-._~!*'()%]+$/.test(body.thumbnailPhotoId) &&
    body.thumbnailPhotoId.length <= 512
      ? body.thumbnailPhotoId
      : undefined;
  const item: Record<string, unknown> = {
    PK: `CASTLE#${castleId}`,
    SK: "METADATA",
    name: body.name,
    latitude: body.latitude,
    longitude: body.longitude,
    GSI1PK: "ALL_CASTLES",
    GSI1SK: `CASTLE#${castleId}`,
  };
  if (thumbnailPhotoId !== undefined) item.thumbnailPhotoId = thumbnailPhotoId;
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return ok({ castleId, name: body.name, latitude: body.latitude, longitude: body.longitude, thumbnailPhotoId });
}

async function deleteCastle(
  castleId: string
): Promise<APIGatewayProxyResultV2> {
  const TABLE_NAME = getTableName();
  const { Items = [] } = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `CASTLE#${castleId}` },
    })
  );
  if (!Items.some((item) => item.SK === "METADATA")) return notFound();
  for (let i = 0; i < Items.length; i += 25) {
    const { UnprocessedItems } = await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: Items.slice(i, i + 25).map((item) => ({
            DeleteRequest: { Key: { PK: item.PK as string, SK: item.SK as string } },
          })),
        },
      })
    );
    if (UnprocessedItems && Object.keys(UnprocessedItems).length > 0) {
      return internalError(new Error("BatchWriteItem had unprocessed items; retry DELETE to complete"));
    }
  }
  return noContent();
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const castleId = event.pathParameters?.castleId;

    if (method !== "GET" && !requireAuth(event)) {
      return unauthorized();
    }

    if (method === "GET" && !castleId) return listCastles();
    if (method === "GET" && castleId) return getCastle(castleId);
    if (method === "POST") return createCastle(event);
    if (method === "PUT" && castleId) return updateCastle(castleId, event);
    if (method === "DELETE" && castleId) return deleteCastle(castleId);

    return notFound();
  } catch (err) {
    return internalError(err);
  }
};
