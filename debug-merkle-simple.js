// Save as debug-merkle-simple.js
// Run with: node debug-merkle-simple.js

const mongoose = require("mongoose");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

// 🔧 MANUAL CONFIGURATION - UPDATE THESE VALUES
const MONGODB_URL = "mongodb+srv://docmate:amit1234@cluster0.lif8a.mongodb.net/"; // ← Update this
const INSTITUTE = "iitk";
const BATCH_MERKLE_ROOT = "0xd39551ab54861e2f8be5daad5bdb5afd7119aabb97d800896d1473795b66c669";
const TARGET_HASH = "ed0cbdba1017048a049c000b1f2fc26226c1e3c6415c9d8508c855be637497a6";

// Simple FileSchema - adjust if your schema is different
const FileSchema = new mongoose.Schema({
  title: String,
  category: String,
  docType: String,
  hash: String,
  url: String,
  s3Key: String,
  studentName: String,
  studentEmail: String,
  regdNo: String,
  institute: String,
  uploadedBy: String,
  issuer: String,
  issuedAt: Date,
  isApproved: Boolean,
  isBatch: Boolean,
  batchMerkleRoot: String,
  batchId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Function to get file model (similar to your getFileModel)
function getFileModel(institute) {
  const collectionName = `files_${institute.toLowerCase()}`;
  return mongoose.model('File', FileSchema, collectionName);
}

async function debugBatch() {
  try {
    console.log("🔧 Configuration:");
    console.log(`   MongoDB URL: ${MONGODB_URL}`);
    console.log(`   Institute: ${INSTITUTE}`);
    console.log(`   Batch Root: ${BATCH_MERKLE_ROOT}`);
    console.log(`   Target Hash: ${TARGET_HASH}`);

    // Connect to database
    await mongoose.connect(MONGODB_URL);
    console.log("📡 Connected to database");

    const FileModel = getFileModel(INSTITUTE);
    
    // Get all documents from the batch
    const batchDocs = await FileModel.find({ 
      batchMerkleRoot: BATCH_MERKLE_ROOT 
    }).sort({ regdNo: 1 });
    
    console.log(`\n📋 Found ${batchDocs.length} documents in batch:`);
    
    if (batchDocs.length === 0) {
      console.log("❌ No documents found! Check:");
      console.log("   1. Batch merkle root is correct");
      console.log("   2. Institute name is correct");
      console.log("   3. Database connection is to the right database");
      return;
    }
    
    batchDocs.forEach((doc, i) => {
      const isTarget = doc.hash === TARGET_HASH ? " 👈 TARGET" : "";
      console.log(`  ${i}: ${doc.regdNo} -> ${doc.hash}${isTarget}`);
    });
    
    // Check if target document exists in batch
    const targetExists = batchDocs.some(d => d.hash === TARGET_HASH);
    if (!targetExists) {
      console.log(`\n❌ Target document with hash ${TARGET_HASH} not found in batch!`);
      console.log("   This explains why verification fails.");
      return;
    }
    
    console.log(`\n✅ Target document found in batch at regdNo: ${batchDocs.find(d => d.hash === TARGET_HASH).regdNo}`);
    
    // Test different sorting methods
    console.log("\n🧪 Testing Merkle tree configurations:");
    
    const leaves = batchDocs.map(d => Buffer.from(d.hash, "hex"));
    
    // Method 1: sortPairs: true (your upload method)
    const sortedTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const sortedRoot = "0x" + sortedTree.getRoot().toString("hex");
    
    // Method 2: sortPairs: false
    const unsortedTree = new MerkleTree(leaves, keccak256, { sortPairs: false });
    const unsortedRoot = "0x" + unsortedTree.getRoot().toString("hex");
    
    console.log(`🌳 Stored Root:     ${BATCH_MERKLE_ROOT}`);
    console.log(`🌳 sortPairs=true:  ${sortedRoot} ${sortedRoot === BATCH_MERKLE_ROOT ? '✅ MATCH' : '❌'}`);
    console.log(`🌳 sortPairs=false: ${unsortedRoot} ${unsortedRoot === BATCH_MERKLE_ROOT ? '✅ MATCH' : '❌'}`);
    
    // Test proof generation
    const leaf = Buffer.from(TARGET_HASH, "hex");
    let workingTree = null;
    let treeType = "";
    
    if (sortedRoot === BATCH_MERKLE_ROOT) {
      workingTree = sortedTree;
      treeType = "sortPairs=true";
    } else if (unsortedRoot === BATCH_MERKLE_ROOT) {
      workingTree = unsortedTree;
      treeType = "sortPairs=false";
    }
    
    if (workingTree) {
      console.log(`\n🔍 Testing proof generation (using ${treeType}):`);
      const proof = workingTree.getProof(leaf);
      const proofHex = proof.map(p => "0x" + p.data.toString("hex"));
      const verifies = workingTree.verify(proof, leaf, workingTree.getRoot());
      
      console.log(`   Proof: [${proofHex.join(', ')}]`);
      console.log(`   Local verification: ${verifies ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (verifies) {
        console.log("\n✅ DIAGNOSIS: Merkle tree and proof generation work correctly!");
        console.log("   The issue is likely in your blockchain verification logic.");
        console.log("   Check that you're passing the proof correctly to the smart contract.");
      }
    } else {
      console.log("\n❌ DIAGNOSIS: Merkle tree root mismatch!");
      console.log("   None of the tree configurations produce the stored root.");
      console.log("   Possible causes:");
      console.log("   1. Documents are in different order than during upload");
      console.log("   2. Some documents are missing from the batch");
      console.log("   3. sortPairs configuration changed between upload and verification");
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from database");
  }
}

// Run the debug
debugBatch();