import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.AWS_REGION) throw new Error("AWS_REGION is required");
if (!process.env.AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is required");
if (!process.env.AWS_ACCESS_KEY_ID)
  throw new Error("AWS_ACCESS_KEY_ID is required");
if (!process.env.AWS_SECRET_ACCESS_KEY)
  throw new Error("AWS_SECRET_ACCESS_KEY is required");

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET;

export const getAvatarUrl = (key: string): string => {
  if (process.env.AWS_CLOUDFRONT_URL) {
    return `${process.env.AWS_CLOUDFRONT_URL}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
