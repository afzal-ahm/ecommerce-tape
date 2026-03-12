// utils/fileHandlers.js
import multer from "multer";
import sharp from "sharp";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import s3client, { BUCKET_NAME, PUBLIC_URL, UPLOAD_FOLDER } from "../utils/s3client.js";

// Set up multer storage
const storage = multer.memoryStorage();
export const uploadFiles = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for PDFs and audio
});

// Function to process and upload image
export const processAndUploadImage = async (file, subfolder = "images") => {
  try {
    console.log(`🔧 Processing image: ${file.originalname}`);
    console.log(
      `🔧 File buffer size: ${file.buffer?.length || "undefined"} bytes`
    );

    const { originalname, buffer } = file;

    if (!buffer) {
      throw new Error("File buffer is missing");
    }

    // Sanitize filename and add timestamp
    const timestamp = Date.now();
    const sanitizedName = originalname
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "-");
    const fileExtension = originalname.split(".").pop().toLowerCase();

    // Use UPLOAD_FOLDER from s3client for consistency
    const filename = `${UPLOAD_FOLDER}/${subfolder}/${timestamp}-${sanitizedName}`;

    console.log(`🔧 Target filename: ${filename}`);

    // Process image with sharp to optimize
    console.log(`🔧 Starting Sharp processing...`);
    const processedBuffer = await sharp(buffer)
      .resize(1200, null, { withoutEnlargement: true })
      .toBuffer();

    console.log(
      `🔧 Sharp processing complete. Processed size: ${processedBuffer.length} bytes`
    );

    // Upload to R2 with proper content type
    console.log(`🔧 Starting R2 upload...`);
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: processedBuffer,
      ContentType: `image/${fileExtension === "png"
        ? "png"
        : fileExtension === "gif"
          ? "gif"
          : "jpeg"
        }`,
    });

    await s3client.send(putCommand);

    console.log(`✅ Successfully uploaded image to R2: ${filename}`);
    return filename;
  } catch (error) {
    console.error("❌ Image processing/upload failed:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      bucketName: BUCKET_NAME,
    });
    throw error;
  }
};

// Function to upload PDF
export const uploadPDF = async (file) => {
  const { originalname, buffer, mimetype } = file;

  const filename = `${UPLOAD_FOLDER}/pdfs/${Date.now()}-${originalname
    .toLowerCase()
    .split(" ")
    .join("-")}`;

  try {
    await s3client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: mimetype || "application/pdf",
      })
    );

    console.log(`✅ Successfully uploaded PDF to R2: ${filename}`);
    return filename;
  } catch (error) {
    console.error("❌ PDF upload failed:", error);
    throw error;
  }
};

// Function to upload Audio
export const uploadAudio = async (file) => {
  const { originalname, buffer, mimetype } = file;

  const filename = `${UPLOAD_FOLDER}/audio/${Date.now()}-${originalname
    .toLowerCase()
    .split(" ")
    .join("-")}`;

  try {
    await s3client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: mimetype || "audio/mpeg",
      })
    );

    console.log(`✅ Successfully uploaded audio to R2: ${filename}`);
    return filename;
  } catch (error) {
    console.error("❌ Audio upload failed:", error);
    throw error;
  }
};

// Middleware to handle file processing
export const processFiles = async (req, res, next) => {
  try {
    // Process thumbnail/image if exists
    if (req.files?.thumbnail) {
      const filename = await processAndUploadImage(
        req.files.thumbnail[0],
        "thumbnails"
      );
      req.files.thumbnail[0].filename = filename;
    }

    // Process PDF if exists
    if (req.files?.pdf) {
      const filename = await uploadPDF(req.files.pdf[0]);
      req.files.pdf[0].filename = filename;
    }

    // Process audio if exists
    if (req.files?.audio) {
      const filename = await uploadAudio(req.files.audio[0]);
      req.files.audio[0].filename = filename;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Get file URL from filename - Using R2 public URL
export const getFileUrl = (filename) => {
  if (!filename) return null;
  // Use R2 public URL
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${filename}`;
  }
  return `${process.env.R2_PUBLIC_URL}/${filename}`;
};

// Delete file from Cloudflare R2
export const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    let Key;

    // Check if fileUrl is a full URL
    if (fileUrl.startsWith("http")) {
      const parsedUrl = new URL(fileUrl);
      Key = parsedUrl.pathname.slice(1);
    } else {
      Key = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
    }

    await s3client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key,
      })
    );

    console.log(`✅ File deleted from R2: ${Key}`);
  } catch (error) {
    console.error("❌ File deletion error:", error);
    throw error;
  }
};
