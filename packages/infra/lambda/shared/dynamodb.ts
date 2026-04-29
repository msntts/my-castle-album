import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

if (!process.env.TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.TABLE_NAME;
