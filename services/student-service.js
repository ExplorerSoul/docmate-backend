const { ethers } = require('ethers');
const BlockchainCertificate = require('../database/models/BlockchainCertificate');
const logger = require('./logger');
const config = require('../loaders/config');

// ABI and provider setup
const contractABI = require('../contracts/AcademicCertificateABI.json');
const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, provider);

/**
 * Fetch all certificates issued to a student by matching studentId
 * @param {string} studentId - Format: regdNo@institute
 */
async function getCertificateDataForDashboard(studentId) {
  try {
    const totalCertificatesBN = await contract.certificateCount();
    const total = totalCertificatesBN.toNumber();
    const certs = [];

    for (let i = 0; i < total; i++) {
      const [storedId, fileHash, issuer, issuedAt] = await contract.getCertificate(i);

      if (storedId.toLowerCase() === studentId.toLowerCase()) {
        certs.push({
          certId: i.toString(),
          studentId: storedId,
          fileHash,
          issuer,
          issuedAt: new Date(Number(issuedAt) * 1000).toISOString()
        });
      }
    }

    // Optionally merge with MongoDB data (if exists)
    const hashes = certs.map(cert => cert.fileHash);
    const dbData = await BlockchainCertificate.find({ certHash: { $in: hashes } }).lean();

    const merged = certs.map(cert => {
      const dbMatch = dbData.find(db => db.certHash === cert.fileHash);
      return {
        ...cert,
        ...(dbMatch || {})
      };
    });

    return merged;
  } catch (err) {
    logger.error("❌ Failed to fetch student certificates:", err);
    throw err;
  }
}

module.exports = { getCertificateDataForDashboard };

