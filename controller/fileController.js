// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
// const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//   },
// });

// exports.getPresignedFileUrl = async (req, res) => {
//   try {
//     // this line is changed
//     const rawKey = req.params.key;
//     const key = decodeURIComponent(rawKey);

//     if (!key) {
//       return res.status(400).json({ error: "Missing file key" });
//     }

//     const command = new GetObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//     });

//     const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

//     return res.status(200).json({ url: signedUrl });
//   } catch (err) {
//     console.error("❌ Failed to generate presigned URL:", err.message);
//     return res.status(500).json({ error: "Failed to generate download URL" });
//   }
// };


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
      return res.status(400).json({ error: "Missing file key" });
    }

    const { institute, regdNo } = req.user;
    const File = getFileModel(institute);

    // 🔒 Find the file and check if it belongs to the student
    const file = await File.findOne({ s3Key: key });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.regdNo !== regdNo) {
      return res.status(403).json({ error: "Access denied: This is not your document" });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    // 🔑 Signed URL for download (expires in 60 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error("❌ Failed to generate presigned URL:", err.message);
    return res.status(500).json({ error: "Failed to generate download URL" });
  }
};
