import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({});

export function getPhotosBucketName(): string {
  const name = process.env.PHOTOS_BUCKET_NAME;
  if (!name) throw new Error("PHOTOS_BUCKET_NAME environment variable is not set");
  return name;
}

export function getCloudfrontDomain(): string {
  const domain = process.env.CLOUDFRONT_DOMAIN;
  if (!domain) throw new Error("CLOUDFRONT_DOMAIN environment variable is not set");
  return domain;
}
