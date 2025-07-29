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
  try {
    // ✅ Sanitize filename
    const safeFilename = originalFilename
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/[^a-zA-Z0-9.\-_]/g, ""); // Remove unsafe chars

    const uniqueFilename = `${Date.now()}-${uuidv4()}-${safeFilename}`;
    const s3Key = `uploads/${uniqueFilename}`;

    const contentType = getMimeType(originalFilename);

    // ✅ Create S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      // ACL: "public-read", // ⚠️ Only if bucket policy allows public access
    });

    // ✅ Upload file to S3
    await s3Client.send(command);

    // ✅ Construct public URL
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(s3Key)}`;

    return { s3Key, publicUrl };
  } catch (err) {
    console.error(`❌ S3 Upload Failed for ${originalFilename} -> ${err.message}`);
    throw new Error("S3 upload failed");
  }
}

/**
 * Detect MIME type based on file extension
 */
function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    zip: "application/zip",
    "x-zip-compressed": "application/x-zip-compressed",
  };
  return map[ext] || "application/octet-stream";
}

module.exports = uploadToS3;
