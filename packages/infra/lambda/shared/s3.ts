import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.PHOTOS_BUCKET_NAME) {
  throw new Error("PHOTOS_BUCKET_NAME environment variable is not set");
}
if (!process.env.CLOUDFRONT_DOMAIN) {
  throw new Error("CLOUDFRONT_DOMAIN environment variable is not set");
}

export const s3Client = new S3Client({});
export const PHOTOS_BUCKET_NAME = process.env.PHOTOS_BUCKET_NAME;
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
