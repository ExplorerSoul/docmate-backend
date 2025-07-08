const crypto = require("crypto");
const { ethers } = require("ethers");
const config = require("../loaders/config");
const BlockchainCertificate = require("../database/models/BlockchainCertificate");
const contractABI = require("../contracts/AcademicCertificateABI.json");

const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, provider);

/**
 * Verifies uploaded file against on-chain hashes.
 * - Hashes uploaded file (SHA-256)
 * - Compares with all certs on-chain
 * - Returns match status and certificate metadata if matched
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const file = req.file;

    if (!file || !file.buffer) {
      return res.status(400).json({ error: "File is required for verification." });
    }

    // 1. Hash the file (SHA-256)
    const fileHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // 2. Get total cert count
  const countBN = await contract.certificateCount();
  const total = Number(countBN); // ✅ works with ethers v6



    // 3. Search on-chain for matching hash
    let match = null;
    for (let i = 0; i < total; i++) {
      const [studentId, storedHash, issuer, issuedAt] = await contract.getCertificate(i);
      if (storedHash.toLowerCase() === fileHash.toLowerCase()) {
        match = { certId: i.toString(), studentId, issuer, issuedAt: new Date(Number(issuedAt) * 1000), storedHash };
        break;
      }
    }

    // 4. Respond based on match
    if (match) {
      return res.status(200).json({
        status: "✅ verified",
        verified: true,
        fileHash,
        certId: match.certId,
        studentId: match.studentId,
        issuer: match.issuer,
        issuedAt: match.issuedAt.toISOString()
      });
    } else {
      return res.status(404).json({
        status: "❌ not found",
        verified: false,
        fileHash,
        message: "No matching certificate found on blockchain."
      });
    }

  } catch (err) {
    console.error("❌ Verification error:", err);
    return res.status(500).json({ error: "Verification failed.", details: err.message });
  }
};
