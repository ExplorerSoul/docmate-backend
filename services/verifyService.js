const crypto = require("crypto");
const { JsonRpcProvider, Contract } = require("ethers");
const config = require("../loaders/config");
const abi = require("../contracts/AcademicCertificateABI.json");

const provider = new JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new Contract(config.ethereum.contractAddress, abi, provider);

// ===========================
// 📌 Verifies an uploaded document by hash
// ===========================
async function verifyDocument(fileBuffer) {
  try {
    // 1. 🔐 Generate SHA256 hash of uploaded file
    const providedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // 2. 🔁 Iterate over all certificates on-chain
    const count = await contract.certificateCount();

    for (let i = 0; i < count; i++) {
      const cert = await contract.getCertificate(i);
      const [studentId, fileHash, issuer, issuedAt] = cert;

      if (fileHash.toLowerCase() === providedHash.toLowerCase()) {
        // ✅ Match found
        return {
          verified: true,
          certId: i.toString(),
          fileHash,
          providedHash,
          studentId,
          issuer,
          issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
          status: "verified"
        };
      }
    }

    // ❌ No match found
    return {
      verified: false,
      providedHash,
      status: "not_found",
      message: "No matching certificate found on blockchain."
    };

  } catch (err) {
    console.error("❌ verifyDocument error:", err);
    throw new Error("Verification failed.");
  }
}

module.exports = { verifyDocument };
