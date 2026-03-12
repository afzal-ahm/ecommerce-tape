import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3client, { BUCKET_NAME, PUBLIC_URL } from "./s3client.js";

export const deleteFromS3 = async (fileUrl) => {
  try {
    let Key;

    // Check if fileUrl is a full URL
    if (fileUrl && fileUrl.startsWith("http")) {
      const parsedUrl = new URL(fileUrl);
      Key = parsedUrl.pathname.slice(1);
    } else if (fileUrl) {
      Key = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
    } else {
      return; // No file URL to delete
    }

    await s3client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key,
      })
    );

    console.log(`✅ Successfully deleted file from R2: ${Key}`);
  } catch (error) {
    console.error("❌ R2 deletion error:", error);
    throw error;
  }
};

export const getFileUrl = (filename) => {
  if (!filename) return null;

  // Use the R2 public URL from environment
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${filename}`;
  }

  // Fallback
  return `${process.env.R2_PUBLIC_URL || 'https://pub-5378641ac9774021be7c65a006461132.r2.dev'}/${filename}`;
};
