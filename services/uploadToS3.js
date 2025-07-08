// services/uploadToS3.js
const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

async function uploadToS3(buffer, originalFilename) {
  const uniqueFilename = `${Date.now()}-${uuidv4()}-${originalFilename}`;
  const key = `uploads/${uniqueFilename}`;

  const contentType = getMimeType(originalFilename);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "private", // Optional: make public or remove if private
  });

  try {
    await s3Client.send(command);
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return publicUrl;
  } catch (err) {
    console.error("S3 Upload Failed:", err);
    throw err;
  }
}

function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    zip: "application/zip",
  };
  return map[ext] || "application/octet-stream";
}

module.exports = uploadToS3;
