const keccak256 = require("keccak256");
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs"); // Import MerkleTree directly
const config = require("../loaders/config");
const BlockchainCertificate = require("../database/models/BlockchainCertificate");
const { getFileModel } = require("../database/models/FileSchema");
const contractABI = require("../contracts/AcademicCertificateABI.json");

const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, provider);

exports.verifyCertificate = async (req, res) => {
  try {
    const file = req.file;
    const { institute } = req.body;

    if (!file || !file.buffer || !institute) {
      return res.status(400).json({ error: "File and institute are required." });
    }

    const fileBuffer = file.buffer;
    const fileHash = keccak256(fileBuffer).toString("hex");

    const FileModel = getFileModel(institute.toLowerCase());
    const doc = await FileModel.findOne({ hash: fileHash });

    if (!doc) {
      return res.status(404).json({
        status: "❌ not found",
        verified: false,
        fileHash,
        message: "Document not found in system."
      });
    }

    const record = await BlockchainCertificate.findOne({ docHash: fileHash });
    if (!record) {
      return res.status(200).json({
        status: "⚠ found in DB only",
        verified: false,
        fileHash,
        document: doc,
        message: "Document exists in DB but not found in blockchain records."
      });
    }

    const isBatch = doc.isBatch === true;

    // ✅ SINGLE verification
    if (!isBatch && /^\d+$/.test(record.certId)) {
      try {
        const [studentId, storedHash, issuer, issuedAt] = await contract.getCertificate(Number(record.certId));
        const onChainVerified = storedHash.toLowerCase() === fileHash.toLowerCase();

        return res.status(200).json({
          status: onChainVerified ? "✅ verified (single)" : "❌ hash mismatch",
          verified: onChainVerified,
          type: "single",
          fileHash,
          certId: record.certId,
          txHash: record.txHash,
          issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
          studentId,
          issuer,
          document: doc
        });
      } catch (err) {
        console.warn("⚠ Blockchain lookup failed (single):", err.message);
      }
    }

    // ✅ BATCH verification - FIXED
    if (
      isBatch &&
      record.certId.includes("-") &&
      record.batchMerkleRoot &&
      record.batchId !== undefined &&
      typeof contract.verifyInBatch === "function"
    ) {
      try {
        // Get all documents from the same batch
        const batchDocs = await FileModel.find({ 
          batchMerkleRoot: record.batchMerkleRoot 
        }).sort({ regdNo: 1 }); // Sort by regdNo for consistency

        console.log(`📋 Found ${batchDocs.length} documents in batch ${record.batchId}`);
        
        // Build Merkle tree with SAME configuration as upload
        const leaves = batchDocs.map(d => Buffer.from(d.hash, "hex"));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true }); // ✅ Same as upload
        
        // Verify the root matches
        const computedRoot = "0x" + tree.getRoot().toString("hex");
        console.log(`🌳 Computed root: ${computedRoot}`);
        console.log(`🌳 Expected root:  ${record.batchMerkleRoot}`);
        
        if (computedRoot !== record.batchMerkleRoot) {
          return res.status(200).json({
            status: "❌ Merkle root mismatch",
            verified: false,
            type: "batch",
            fileHash,
            message: `Computed root ${computedRoot} doesn't match stored root ${record.batchMerkleRoot}`,
            document: doc
          });
        }

        // Generate proof for the current document
        const leaf = Buffer.from(fileHash, "hex");
        const proof = tree.getProof(leaf);
        const proofHex = proof.map(p => "0x" + p.data.toString("hex"));
        
        console.log(`🔍 Generated proof for ${fileHash}:`, proofHex);
        console.log(`🔍 Leaf (hex): 0x${fileHash}`);
        console.log(`🔍 Batch ID: ${record.batchId}`);

        // ✅ FIXED: Proper blockchain verification
        try {
          // Your contract expects bytes32 for the leaf
          // Convert hex string to bytes32 format
          const leafBytes32 = "0x" + fileHash;
          
          // Proof is already in correct bytes32[] format
          const proofBytes32 = proofHex;
          
          console.log(`🔗 Calling contract.verifyInBatch with:`);
          console.log(`   leaf: ${leafBytes32}`);
          console.log(`   batchId: ${Number(record.batchId)}`);
          console.log(`   proof: [${proofBytes32.join(', ')}]`);
          
          const verified = await contract.verifyInBatch(
            leafBytes32,           // bytes32 leaf (0x + 64 hex chars)
            Number(record.batchId), // uint256 batchId  
            proofBytes32           // bytes32[] proof
          );
          
          console.log(`🔗 Contract returned: ${verified}`);
          
          return res.status(200).json({
            status: verified ? "✅ verified (batch)" : "❌ not in Merkle tree",
            verified,
            type: "batch",
            fileHash,
            certId: record.certId,
            batchMerkleRoot: record.batchMerkleRoot,
            batchId: record.batchId,
            txHash: record.txHash,
            proof: proofBytes32,
            debug: {
              batchSize: batchDocs.length,
              computedRoot,
              storedRoot: record.batchMerkleRoot,
              rootMatch: computedRoot === record.batchMerkleRoot,
              leafSent: leafBytes32,
              proofSent: proofBytes32
            },
            document: doc
          });
        
        } catch (contractError) {
          console.error("❌ Contract call failed:", contractError.message);
          
          return res.status(500).json({
            status: "❌ contract error",
            verified: false,
            error: contractError.message,
            fileHash,
            document: doc
          });
        }
      } catch (err) {
        console.error("⚠ Batch verification failed:", err.message);
        return res.status(500).json({
          status: "❌ verification error",
          verified: false,
          error: err.message,
          document: doc
        });
      }
    }

    // ❗Fallback
    return res.status(200).json({
      status: "⚠ found in DB only",
      verified: false,
      fileHash,
      document: doc,
      message: "Document exists in DB but was not verified on-chain. Possibly mismatched upload type or missing blockchain info."
    });

  } catch (err) {
    console.error("❌ Verification error:", err.stack || err.message);
    return res.status(500).json({ error: "Server error while fetching documents.", details: err.message });
  }
};