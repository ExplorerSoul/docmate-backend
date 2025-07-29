const mongoose = require("mongoose");

const blockchainCertificateSchema = new mongoose.Schema({
  certId: {
    type: String,
    required: true,
    unique: true, // Unique across both single and batch uploads
  },
  studentId: {
    type: String,
    required: true, // Format: 2214134@iitk
  },
  docHash: {
    type: String,
    required: true, // SHA-256 hash of the uploaded file
  },
  issuer: {
    type: String,
    required: true, // Institute name
  },
  txHash: {
    type: String,
    required: true, // Ethereum transaction hash
  },
  issuedAt: {
    type: Date,
    required: true, // Date when issued (block.timestamp on-chain)
  },

  // ✅ For bulk uploads using Merkle Tree
  isBatch: {
    type: Boolean,
    default: false,
  },
  batchMerkleRoot: {
    type: String, // Hex string with 0x prefix
    default: null,
  },
  batchId: {
    type: String, // e.g. "0", "1" (if you need to track the batch number)
    default: null,
  },
  merkleProof: {
    type: [String], // Array of 0x-prefixed hex hashes
    default: [],
  },

  // ✅ Metadata (optional but useful for filtering/search)
  fileName: {
    type: String,
    default: null,
  },
  docType: {
    type: String, // e.g. degree, bonafide, marksheet
    default: null,
  },
  category: {
    type: String, // e.g. academic, govt
    default: null,
  },
}, { timestamps: true }); // Includes createdAt and updatedAt

module.exports = mongoose.model("BlockchainCertificate", blockchainCertificateSchema);
