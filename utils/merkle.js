const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

/**
 * Build Merkle Tree from an array of file buffers (PDFs or hashes)
 */
function buildMerkleTree(buffers) {
  const leaves = buffers.map(buf => keccak256(buf));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return { tree, leaves };
}

/**
 * Get Merkle proof for a specific file buffer
 */
function getMerkleProof(tree, fileBuffer) {
  const leaf = keccak256(fileBuffer);
  const proof = tree.getProof(leaf).map(p => `0x${p.data.toString("hex")}`);
  const root = `0x${tree.getRoot().toString("hex")}`;
  return { proof, leaf: `0x${leaf.toString("hex")}`, root };
}

module.exports = { buildMerkleTree, getMerkleProof };
