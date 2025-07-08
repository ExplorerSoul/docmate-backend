const mongoose = require("mongoose");

const blockchainCertificateSchema = new mongoose.Schema({
  certId: {
    type: String,
    required: true,
    unique: true, // certId from blockchain (uint256.toString())
  },
  studentId: {
    type: String,
    required: true, // e.g. "2214134@iitk"
  },
  docHash: {
    type: String,
    required: true, // SHA-256 or IPFS hash
  },
  issuer: {
    type: String,
    required: true, // Institute name or contract sender address
  },
  txHash: {
    type: String,
    required: true, // Blockchain transaction hash
  },
  issuedAt: {
    type: Date,
    required: true, // Taken from on-chain block.timestamp
  },
});

module.exports = mongoose.model("BlockchainCertificate", blockchainCertificateSchema);
