const AdmZip = require("adm-zip");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const { ethers } = require("ethers");
const logger = require("../services/logger");
const config = require("../loaders/config");
const { getFileModel } = require("../database/models/FileSchema");
const BlockchainCertificate = require("../database/models/BlockchainCertificate");
const { getStudentModel } = require("../database/models/Student");
const uploadToS3 = require("../services/uploadToS3");
const abi = require("../contracts/AcademicCertificateABI.json");

const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, abi, provider);

// ==========================
// Single Document Upload
// ==========================
exports.uploadDocument = async (req, res) => {
  try {
    const file = req.file;
    const { docType, category, regdNo } = req.body;
    const institute = req.user?.institute;

    if (!file || !regdNo || !docType || !category || !institute) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const Student = getStudentModel(institute);
    const student = await Student.findOne({ regdNo });
    if (!student) return res.status(404).json({ error: "Student not found." });

    const fileBuffer = file.buffer;
    const hash = keccak256(fileBuffer).toString("hex");

    const FileModel = getFileModel(institute);
    const existing = await FileModel.findOne({ hash });
    if (existing) return res.status(409).json({ error: "Document already exists." });

    const signer = new ethers.Wallet(config.ethereum.privateKey, provider);
    const contractWithSigner = contract.connect(signer);

    const tx = await contractWithSigner.issueCertificate(`${regdNo}@${institute}`, hash, {
      gasLimit: BigInt(config.ethereum.gasLimit || 300000),
    });
    const receipt = await tx.wait();

    const event = receipt.logs.find(log => log.fragment?.name === "CertificateIssued");
    const certId = event ? event.args[0].toString() : null;

    const { s3Key, publicUrl } = await uploadToS3(fileBuffer, file.originalname);
    if (!s3Key || !publicUrl) return res.status(500).json({ error: "S3 upload failed." });

    const newDoc = await FileModel.create({
      title: `${docType}_${regdNo}`,
      docType,
      category,
      hash,
      url: publicUrl,
      s3Key,
      studentName: student.name,
      studentEmail: student.email,
      issuer: institute,
      issuedAt: new Date(),
      regdNo,
      institute,
      uploadedBy: req.user.role,
    });

    await BlockchainCertificate.create({
      certId,
      studentId: `${regdNo}@${institute}`,
      docHash: hash,
      issuer: institute,
      txHash: tx.hash,
      issuedAt: new Date(),
    });

    return res.status(201).json({ message: "Uploaded and registered on blockchain.", txHash: tx.hash, certId, document: newDoc });
  } catch (err) {
    logger.error("❌ Upload failed:", err.stack || err.message);
    return res.status(500).json({ error: "Upload failed.", details: err.message });
  }
};

// ==========================
// Bulk Upload from ZIP
// ==========================

exports.bulkUploadFromZip = async (req, res) => {
  try {
    const { category, docType, issuedAt } = req.body;
    const institute = req.user?.institute;
    const zipBuffer = req.file?.buffer;

    if (!zipBuffer || !docType || !category || !institute) {
      return res.status(400).json({ error: "ZIP file, docType, category, and institute are required." });
    }

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    const FileModel = getFileModel(institute);
    const Student = getStudentModel(institute);
    const resultSummary = [];

    // Store metadata for proof mapping
    const docsMeta = [];

    for (const entry of zipEntries) {
      try {
        if (entry.isDirectory) continue;

        const baseName = entry.entryName.split('/').pop().trim();
        if (!baseName.toLowerCase().endsWith(".pdf")) {
          resultSummary.push({ file: baseName, status: "skipped (not PDF)" });
          continue;
        }

        const regdNo = baseName.replace(/\.[^/.]+$/, '');
        if (!/^\d{7}$/.test(regdNo)) {
          resultSummary.push({ file: baseName, status: "invalid regdNo" });
          continue;
        }

        const student = await Student.findOne({ regdNo });
        if (!student) {
          resultSummary.push({ file: baseName, regdNo, status: "student not found" });
          continue;
        }

        const fileBuffer = entry.getData();
        const hash = keccak256(fileBuffer).toString("hex");

        const { s3Key, publicUrl } = await uploadToS3(fileBuffer, baseName);
        if (!s3Key || !publicUrl) {
          resultSummary.push({ file: baseName, regdNo, status: "S3 upload failed" });
          continue;
        }

        docsMeta.push({ regdNo, student, hash, s3Key, publicUrl, fileBuffer, fileName: baseName });
        resultSummary.push({ regdNo, file: baseName, status: "ready" });

      } catch (err) {
        resultSummary.push({ file: entry.entryName, status: "error", error: err.message });
      }
    }

    if (docsMeta.length === 0) {
      return res.status(400).json({ error: "No valid PDFs in ZIP." });
    }

    // ✅ Sort documents by regdNo for consistent ordering
    docsMeta.sort((a, b) => a.regdNo.localeCompare(b.regdNo));

    // ✅ Build Merkle Tree with correct order
    const leaves = docsMeta.map(doc => Buffer.from(doc.hash, "hex"));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = "0x" + tree.getRoot().toString("hex");

    console.log(`🌳 Built Merkle tree with ${leaves.length} leaves`);
    console.log(`🌳 Merkle root: ${merkleRoot}`);

    // ✅ Upload to blockchain
    const signer = new ethers.Wallet(config.ethereum.privateKey, provider);
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.issueBatchMerkle(merkleRoot, {
      gasLimit: BigInt(config.ethereum.gasLimit || 800000),
    });
    const receipt = await tx.wait();
    const batchId = receipt?.logs[0]?.args?.[0]?.toString();

    console.log(`🔗 Blockchain transaction: ${tx.hash}`);
    console.log(`🔗 Batch ID: ${batchId}`);

    // ✅ Save files and certs with CORRECT Merkle proof
    for (let i = 0; i < docsMeta.length; i++) {
      const { regdNo, hash, publicUrl, s3Key, student, fileName } = docsMeta[i];
      const leaf = Buffer.from(hash, "hex");
      
      // ✅ FIXED: Generate correct proof
      const proof = tree.getProof(leaf);
      const proofHex = proof.map(p => "0x" + p.data.toString("hex"));
      
      // ✅ Verify proof locally before saving
      const verifies = tree.verify(proof, leaf, tree.getRoot());
      console.log(`🔍 Proof for ${regdNo} (${hash}): ${verifies ? '✅' : '❌'}`);
      console.log(`   Proof: [${proofHex.join(', ')}]`);

      // Save to file collection
      await FileModel.create({
        title: `${docType}_${regdNo}`,
        docType,
        category,
        hash,
        url: publicUrl,
        s3Key,
        studentName: student.name,
        studentEmail: student.email,
        issuer: institute,
        issuedAt: issuedAt || new Date(),
        regdNo,
        institute,
        uploadedBy: req.user.role,
        isBatch: true,
        batchMerkleRoot: merkleRoot,
        batchId,
      });

      // Save to BlockchainCertificate collection with CORRECT proof
      await BlockchainCertificate.create({
        certId: `${merkleRoot}-${regdNo}`,
        studentId: `${regdNo}@${institute}`,
        docHash: hash,
        issuer: institute,
        txHash: tx.hash,
        issuedAt: issuedAt || new Date(),
        isBatch: true,
        batchMerkleRoot: merkleRoot,
        batchId,
        merkleProof: proofHex, // ✅ CORRECT proof
      });
    }

    return res.status(200).json({
      message: "✅ Bulk upload successful.",
      txHash: tx.hash,
      merkleRoot,
      batchId,
      summary: resultSummary,
    });

  } catch (err) {
    logger.error("❌ Bulk upload failed:", err.stack || err.message);
    return res.status(500).json({ error: "Server error during bulk upload.", details: err.message });
  }
};

// ==========================
// Fetch All Documents (Admin)
// ==========================
exports.getAllDocuments = async (req, res) => {
  try {
    const institute = req.user?.institute;
    if (!institute) return res.status(400).json({ error: "Unauthorized access. Admin login required." });

    const FileModel = getFileModel(institute);
    const docs = await FileModel.find().sort({ createdAt: -1 });
    return res.status(200).json(docs);
  } catch (err) {
    logger.error("❌ Failed to fetch documents:", err.stack);
    return res.status(500).json({ error: "Server error while fetching documents." });
  }
};

// ==========================
// Fetch My Documents (Student)
// ==========================
exports.getMyDocuments = async (req, res) => {
  try {
    const { institute, regdNo, role } = req.user;
    if (!institute) return res.status(403).json({ error: "Unauthorized access. Missing institute." });

    const FileModel = getFileModel(institute);
    const query = role === "student" ? { regdNo, institute } : {};
    const docs = await FileModel.find(query).sort({ createdAt: -1 });

    return res.status(200).json({ documents: docs, count: docs.length });
  } catch (err) {
    logger.error("❌ Failed to fetch documents:", err.stack);
    return res.status(500).json({ error: "Server error while fetching documents." });
  }
};
