import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`${key} environment variable is not set`);
  return val;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

async function scanAll(tableName: string): Promise<Item[]> {
  const items: Item[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const { Items = [], LastEvaluatedKey } = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items as Item[]));
    lastKey = LastEvaluatedKey as typeof lastKey;
  } while (lastKey);
  return items;
}

export const handler = async (): Promise<void> => {
  const TABLE_NAME = getEnv("TABLE_NAME");
  const PHOTOS_BUCKET_NAME = getEnv("PHOTOS_BUCKET_NAME");
  const allItems = await scanAll(TABLE_NAME);

  const byPK = new Map<string, Item[]>();
  const validS3Keys = new Set<string>();

  for (const item of allItems) {
    const pk = item.PK as string;
    const sk = item.SK as string;

    if (!byPK.has(pk)) byPK.set(pk, []);
    byPK.get(pk)!.push(item);

    if (pk.startsWith("CASTLE#") && sk.startsWith("PHOTO#")) {
      const castleId = pk.slice("CASTLE#".length);
      const photoId = sk.slice("PHOTO#".length);
      validS3Keys.add(`photos/${castleId}/${photoId}`);
    }
  }

  await cleanupOrphanedDynamoDBPhotos(byPK, TABLE_NAME);
  await cleanupOrphanedS3Objects(validS3Keys, PHOTOS_BUCKET_NAME);
};

async function cleanupOrphanedDynamoDBPhotos(
  byPK: Map<string, Item[]>,
  tableName: string
): Promise<void> {
  for (const [pk, items] of byPK.entries()) {
    if (!pk.startsWith("CASTLE#")) continue;
    if (items.some((item) => (item.SK as string) === "METADATA")) continue;

    const photoItems = items.filter((item) =>
      (item.SK as string).startsWith("PHOTO#")
    );
    if (photoItems.length === 0) continue;

    console.log(`Removing ${photoItems.length} orphaned PHOTO records for ${pk}`);
    for (let i = 0; i < photoItems.length; i += 25) {
      const { UnprocessedItems } = await ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: photoItems.slice(i, i + 25).map((item) => ({
              DeleteRequest: {
                Key: { PK: item.PK as string, SK: item.SK as string },
              },
            })),
          },
        })
      );
      if (UnprocessedItems && Object.keys(UnprocessedItems).length > 0) {
        console.warn("Unprocessed items in BatchWrite; will be retried next run");
      }
    }
  }
}

async function cleanupOrphanedS3Objects(
  validS3Keys: Set<string>,
  bucketName: string
): Promise<void> {
  const orphanedKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "photos/",
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of response.Contents ?? []) {
      if (!obj.Key) continue;
      const parts = obj.Key.split("/");
      if (parts.length !== 3) continue;
      if (!validS3Keys.has(obj.Key)) {
        orphanedKeys.push(obj.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  if (orphanedKeys.length === 0) return;

  console.log(`Deleting ${orphanedKeys.length} orphaned S3 objects`);
  for (let i = 0; i < orphanedKeys.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: orphanedKeys.slice(i, i + 1000).map((key) => ({ Key: key })),
        },
      })
    );
  }
}
