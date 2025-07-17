const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

/**
 * Uploads a file buffer to S3 and returns key + public URL
 * @param {Buffer} buffer - File buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<{ s3Key: string, publicUrl: string }>}
 */
async function uploadToS3(buffer, originalFilename) {
  const uniqueFilename = `${Date.now()}-${uuidv4()}-${originalFilename}`;
  const s3Key = `uploads/${uniqueFilename}`;

  const contentType = getMimeType(originalFilename);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);

    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    return { s3Key, publicUrl };
  } catch (err) {
    console.error("❌ S3 Upload Failed:", err);
    throw err;
  }
}

function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = { pdf: "application/pdf", zip: "application/zip" };
  return map[ext] || "application/octet-stream";
}

module.exports = uploadToS3;
