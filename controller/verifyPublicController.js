const { verifyDocument } = require("../services/verifyService");
const BlockchainCertificate = require("../database/models/BlockchainCertificate");
const crypto = require("crypto");

exports.verifyPublicDocument = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Missing file." });
    }

    // 🔐 Step 1: Hash the uploaded file
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // 🔎 Step 2: Search for the hash in DB
    const record = await BlockchainCertificate.findOne({ certHash: hash });

    if (!record) {
      return res.status(404).json({
        status: "not_found",
        message: "❌ No matching certificate found. The document might be unissued or tampered.",
      });
    }

    // 🔗 Step 3: Verify against blockchain
    let result;
    try {
      result = await verifyDocument(record.certUUID, hash);
    } catch (verifyErr) {
      console.error("⚠️ Blockchain verification failed:", verifyErr);
      return res.status(500).json({
        status: "error",
        message: "⚠️ Failed to verify document on blockchain.",
      });
    }

    // 🎯 Step 4: Final status result formatting
    const finalStatus = result.verified ? "verified" : "tampered";

    return res.status(200).json({
      status: finalStatus,
      verified: result.verified,
      certUUID: record.certUUID,
      providedHash: hash,
      storedHash: result.storedHash,
      title: record.title,
      issuer: record.issuer,
      studentAddress: result.studentAddress,
      issuedAt: result.issuedAt,
      url: record.fileUrl,
      message:
        finalStatus === "verified"
          ? "✅ Document is verified and authentic."
          : "❌ Hash mismatch detected. The document may be tampered.",
    });
  } catch (err) {
    console.error("❌ Public verification error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal server error during verification.",
    });
  }
};
