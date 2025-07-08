const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

exports.getPresignedFileUrl = async (req, res) => {
  try {
    const rawKey = req.params[0];
    const key = decodeURIComponent(rawKey); // Handles %20, etc.

    if (!key) {
      return res.status(400).json({ error: "Missing file key" });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error("❌ Failed to generate presigned URL:", err.message);
    return res.status(500).json({ error: "Failed to generate download URL" });
  }
};
