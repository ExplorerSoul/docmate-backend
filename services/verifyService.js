const crypto = require("crypto");
const { JsonRpcProvider, Contract } = require("ethers");
const BlockchainCertificate = require("../database/models/BlockchainCertificate");
const config = require("../loaders/config");
const abi = require("../contracts/AcademicCertificateABI.json");

const provider = new JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new Contract(config.ethereum.contractAddress, abi, provider);

// ✅ Keccak256 for Solidity compatibility
const keccak256 = require("keccak256");

/**
 * Verifies uploaded document by checking DB first and then confirming on-chain.
 * Supports both single and Merkle-root-based batch documents.
 */
async function verifyDocument(fileBuffer) {
  try {
    const providedHashHex = keccak256(fileBuffer).toString("hex");
    const providedHashBuffer = Buffer.from(providedHashHex, "hex");

    const record = await BlockchainCertificate.findOne({ docHash: providedHashHex });
    if (!record) {
      return {
        verified: false,
        status: "not_found",
        providedHash: providedHashHex,
        message: "❌ Document not found in system."
      };
    }

    // ✅ SINGLE Certificate Verification
    if (!record.isBatch && /^\d+$/.test(record.certId)) {
      try {
        const certId = Number(record.certId);
        const [studentId, onChainHash, issuer, issuedAt] = await contract.getCertificate(certId);

        const verified = onChainHash.toLowerCase() === providedHashHex.toLowerCase();
        return {
          verified,
          type: "single",
          certId: certId.toString(),
          studentId,
          issuer,
          txHash: record.txHash,
          issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
          providedHash: providedHashHex,
          status: verified ? "✅ verified" : "❌ hash mismatch"
        };
      } catch (err) {
        console.warn("⚠️ On-chain single cert lookup failed:", err.message);
      }
    }

    // ✅ BATCH Merkle Verification
    if (record.isBatch && record.batchMerkleRoot && record.merkleProof?.length > 0 && record.batchId !== undefined) {
      try {
        const proofBuffers = record.merkleProof.map(p => Buffer.from(p.replace(/^0x/, ""), "hex"));
        const verified = await contract.verifyInBatch(providedHashBuffer, Number(record.batchId), proofBuffers);

        return {
          verified,
          type: "batch",
          certId: record.certId,
          txHash: record.txHash,
          batchId: record.batchId,
          batchMerkleRoot: record.batchMerkleRoot,
          proof: record.merkleProof,
          providedHash: providedHashHex,
          status: verified ? "✅ verified (batch)" : "❌ not in Merkle tree"
        };
      } catch (err) {
        console.warn("⚠️ On-chain batch verification failed:", err.message);
      }
    }

    // 🟡 Partial: No Merkle Proof saved
    if (record.isBatch && record.batchMerkleRoot) {
      return {
        verified: false,
        type: "batch",
        status: "🟡 partial",
        providedHash: providedHashHex,
        batchMerkleRoot: record.batchMerkleRoot,
        txHash: record.txHash,
        message: "📁 Part of batch upload. Merkle proof missing in DB."
      };
    }

    // ⚠️ Found in DB but not on-chain
    return {
      verified: false,
      type: record.isBatch ? "batch" : "single",
      certId: record.certId,
      txHash: record.txHash,
      providedHash: providedHashHex,
      status: "⚠ db_only",
      message: "⚠ Document exists in DB but not verified on-chain."
    };

  } catch (err) {
    console.error("❌ verifyDocument error:", err.stack || err.message);
    throw new Error("Verification failed. Please try again.");
  }
}

module.exports = { verifyDocument };
  return res.status(500).json({ error: "Server error while fetching documents.", details: err.message });