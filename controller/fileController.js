const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getFileModel } = require("../database/models/FileSchema");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

exports.getPresignedFileUrl = async (req, res) => {
  try {
    const rawKey = req.params.key;
    const key = decodeURIComponent(rawKey);

    if (!key) {
      return res.status(400).json({ error: "Missing file key in request." });
    }

    const { institute, regdNo, role } = req.user;
    if (!institute) {
      return res.status(401).json({ error: "Unauthorized access." });
    }

    const File = getFileModel(institute);
    const file = await File.findOne({ s3Key: key });

    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    // ✅ Student can only access their own docs; Admin can access all
    if (role === "student" && file.regdNo !== regdNo) {
      return res.status(403).json({ error: "Access denied." });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error("❌ Failed to generate presigned URL:", err);
    return res.status(500).json({ error: "Internal server error while generating URL." });
  }
};
