const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');

/**
 * Hash an object into a Buffer using SHA-256.
 * Uses Node.js crypto for binary compatibility.
 */
function hashData(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest();
}

/**
 * Builds a hierarchical Merkle Tree:
 * university → department → docType → list of certs
 * @param {Object} data - Structured as { university: { department: { docType: [certs] } } }
 * @returns {Object} treeData with all levels and roots
 */
function buildMultiLevelMerkle(data) {
  const result = {};

  for (const university in data) {
    const universityDepartments = data[university];
    const deptRoots = [];

    result[university] = {};

    for (const department in universityDepartments) {
      const deptDocTypes = universityDepartments[department];
      const typeRoots = [];

      result[university][department] = {};

      for (const docType in deptDocTypes) {
        const certList = deptDocTypes[docType];

        // Step 1: Hash certs
        const leaves = certList.map(cert => hashData(cert));

        // Step 2: Build docType tree
        const typeTree = new MerkleTree(leaves, hashData, { sortPairs: true });
        const typeRoot = typeTree.getRoot();

        result[university][department][docType] = {
          typeRoot: typeRoot.toString('hex'),
          leafHashes: leaves.map(buf => buf.toString('hex')),
        };

        typeRoots.push(typeRoot);
      }

      // Step 3: Build department tree from docType roots
      const deptTree = new MerkleTree(typeRoots, hashData, { sortPairs: true });
      const deptRoot = deptTree.getRoot();

      result[university][department].deptRoot = deptRoot.toString('hex');
      deptRoots.push(deptRoot);
    }

    // Step 4: Build university tree from dept roots
    const uniTree = new MerkleTree(deptRoots, hashData, { sortPairs: true });
    const uniRoot = uniTree.getRoot();

    result[university].universityRoot = uniRoot.toString('hex');
  }

  return result;
}

module.exports = { buildMultiLevelMerkle };

