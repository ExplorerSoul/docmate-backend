// services/s3Utils.js
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

async function getPresignedUrl(key, expiresIn = 60 * 5) { // 5 min
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (err) {
    console.error("❌ Failed to generate signed URL:", err);
    throw err;
  }
}

module.exports = { getPresignedUrl };
