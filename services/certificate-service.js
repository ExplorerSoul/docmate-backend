const moment = require('moment');

/**
 * Merges blockchain and DB records using document hash as the unique key.
 * Handles both single and batch uploads.
 */
function mergeCertificateData(dbRecordArray, blockchainRecordArray) {
  // Index blockchain records by fileHash
  const blockchainMap = new Map();
  blockchainRecordArray.forEach(entry => {
    blockchainMap.set(entry.fileHash, entry);
  });

  const merged = dbRecordArray.map(db => {
    const chain = blockchainMap.get(db.docHash || db.hash); // DB field for hash

    return {
      certId: chain?.certId || (db.isBatch ? "MerkleBatch" : null),
      fileHash: db.docHash || db.hash,
      studentId: db.studentId || null,
      issuer: db.issuer || chain?.issuer || null,
      txHash: db.txHash || chain?.txHash || null,
      issuedAt: moment(db.issuedAt || (chain?.issuedAt * 1000)).format("YYYY-MM-DD"),

      // DB-only metadata
      certUUID: db._id?.toString(),
      title: db.title || "",
      fileUrl: db.url || "",
      isBatch: db.isBatch || false,
      batchMerkleRoot: db.batchMerkleRoot || null
    };
  });

  return merged;
}

module.exports = { mergeCertificateData };
