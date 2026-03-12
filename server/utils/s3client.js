import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required environment variables for Cloudflare R2
const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️ Missing R2 environment variables: ${missingVars.join(", ")}. Falling back to DigitalOcean Spaces if configured.`
  );
}

// Cloudflare R2 Configuration
const r2Config = {
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.SPACES_SECRET_KEY,
  },
  forcePathStyle: true,
};

// Export bucket name and public URL for use in other files
export const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.SPACES_BUCKET;
export const PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.SPACES_CDN_URL;
export const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || "ecom-uploads";

export default new S3Client(r2Config);
