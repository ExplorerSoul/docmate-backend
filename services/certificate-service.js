const moment = require('moment');

/**
 * Merges blockchain and DB records using fileHash (certHash) as the unique key.
 * @param {Array} dbRecordArray - Array of certificates from MongoDB
 * @param {Array} blockchainRecordArray - Array of certificates from Ethereum
 * @returns {Array} - Merged certificate objects
 */
function mergeCertificateData(dbRecordArray, blockchainRecordArray) {
  // Index blockchain records by certHash
  const blockchainMap = new Map();
  blockchainRecordArray.forEach(entry => {
    blockchainMap.set(entry.fileHash || entry.certHash, entry);
  });

  const merged = dbRecordArray.map(db => {
    const chain = blockchainMap.get(db.certHash);

    return {
      certId: chain?.certId || null,
      fileHash: db.certHash,
      studentAddress: db.studentAddress || null,
      issuer: db.issuer || chain?.issuer || null,
      txHash: db.txHash || chain?.txHash || null,
      issuedAt: moment(db.dateOfIssuing || chain?.issuedAt * 1000).format("YYYY-MM-DD"),

      // DB-only metadata
      certUUID: db.certUUID || db._id?.toString(),
      title: db.title || "",
      fileUrl: db.fileUrl || "",
    };
  });

  return merged;
}

module.exports = { mergeCertificateData };
