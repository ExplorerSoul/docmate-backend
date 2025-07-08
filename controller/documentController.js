// controller/documentController.js
const AdmZip = require("adm-zip");
const crypto = require("crypto");
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

exports.uploadDocument = async (req, res) => {
  let newDoc = null;

  try {
    const file = req.file;
    const { docType, category, regdNo } = req.body;
    const institute = req.user?.institute;

    if (!file || !regdNo || !docType || !category || !institute) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const Student = getStudentModel(institute);
    const student = await Student.findOne({ regdNo });
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const fileBuffer = file.buffer;
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const FileModel = getFileModel(institute);
    const existing = await FileModel.findOne({ hash });
    if (existing) {
      return res.status(409).json({ error: "Document already exists." });
    }

    // Blockchain first
const signer = new ethers.Wallet(config.ethereum.privateKey, provider);
const contractWithSigner = contract.connect(signer);

const tx = await contractWithSigner.issueCertificate(
  `${regdNo}@${institute}`,  // studentId
  hash,                      // fileHash
  { gasLimit: 300000n }
);
await tx.wait();


    const certCount = await contract.certificateCount();
    const certId = (certCount - 1n).toString();

    // Upload to S3
    const s3Url = await uploadToS3(fileBuffer, file.originalname);
    if (!s3Url) {
      return res.status(500).json({ error: "S3 upload failed." });
    }

    // Save to DB
    newDoc = await FileModel.create({
      title: `${docType}_${regdNo}`,
      category,
      hash,
      url: s3Url,
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
      studentId: `${regdNo}@${institute}`, // ✅ Add this
      docHash: hash,
      issuer: institute,
      txHash: tx.hash,
      issuedAt: new Date(),
    });


    return res.status(201).json({
      message: "Uploaded and registered on blockchain.",
      txHash: tx.hash,
      certId,
      document: newDoc,
    });

  } catch (err) {
    logger.error("❌ Upload failed:", err);
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

    const signer = new ethers.Wallet(config.ethereum.privateKey, provider);
    const contractWithSigner = contract.connect(signer);

    for (const entry of zipEntries) {
      let newDoc = null;
      let s3Url = null;

      try {
        if (entry.isDirectory) continue;

        const fileName = entry.entryName;
        const ext = fileName.split(".").pop().toLowerCase();
        if (ext !== "pdf") {
          resultSummary.push({ file: fileName, status: "skipped (not PDF)" });
          continue;
        }

        const regdNo = fileName.split(".")[0].trim();
        if (!/^\d{7}$/.test(regdNo)) {
          resultSummary.push({ file: fileName, status: "invalid regdNo" });
          continue;
        }

        const student = await Student.findOne({ regdNo });
        if (!student) {
          resultSummary.push({ regdNo, status: "student not found" });
          continue;
        }

        const fileBuffer = entry.getData();
        const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        const existing = await FileModel.findOne({ hash });
        if (existing) {
          resultSummary.push({ regdNo, status: "duplicate document" });
          continue;
        }

        // Blockchain write
        const tx = await contractWithSigner.issueCertificate(
          `${regdNo}@${institute}`,
          hash,
          { gasLimit: 300_000n }
        );
        await tx.wait();

        const certCount = await contract.certificateCount();
        const certId = (certCount - 1n).toString();

        // Upload to S3
        s3Url = await uploadToS3(fileBuffer, `${regdNo}.pdf`);
        if (!s3Url) {
          resultSummary.push({ regdNo, status: "S3 upload failed" });
          continue;
        }

        // Create file record in DB
        newDoc = await FileModel.create({
          title: `${docType}_${regdNo}`,
          category,
          hash,
          url: s3Url,
          studentName: student.name,
          studentEmail: student.email,
          issuer: institute,
          issuedAt: issuedAt || new Date(),
          regdNo,
          institute,
          uploadedBy: req.user.role,
        });

        // Blockchain cert metadata in DB
        await BlockchainCertificate.create({
          certId,
          docHash: hash,
          issuer: institute,
          txHash: tx.hash,
          issuedAt: issuedAt || new Date(),
        });

        resultSummary.push({
          regdNo,
          status: "success",
          txHash: tx.hash,
          certId
        });

      } catch (innerErr) {
        logger.error(`❌ Error processing file: ${entry.entryName}`, innerErr);
        resultSummary.push({
          file: entry.entryName,
          regdNo: entry.entryName.split(".")[0],
          status: "error",
          error: innerErr.message,
          partialSuccess: newDoc ? "document created but blockchain failed" : null
        });
      }
    }

    return res.status(200).json({
      message: "Bulk upload completed.",
      summary: resultSummary,
      total: resultSummary.length,
      successful: resultSummary.filter(r => r.status === "success").length,
      failed: resultSummary.filter(r => r.status === "error").length,
    });

  } catch (err) {
    logger.error("❌ Bulk upload failed", err);
    return res.status(500).json({ error: "Server error during bulk upload." });
  }
};


// ==========================
// Fetch All Documents (Admin)
// ==========================
exports.getAllDocuments = async (req, res) => {
  try {
    const institute = req.user?.institute;
    if (!institute) {
      return res.status(400).json({ error: "Unauthorized access. Admin login required." });
    }

    const FileModel = getFileModel(institute);
    const docs = await FileModel.find().sort({ createdAt: -1 });

    return res.status(200).json(docs);
  } catch (err) {
    logger.error("❌ Failed to fetch documents:", err);
    return res.status(500).json({ error: "Server error while fetching documents." });
  }
};

// ==========================
// Fetch My Documents (Student)
// ==========================
exports.getMyDocuments = async (req, res) => {
  try {
    const { institute, regdNo, role } = req.user;

    if (!institute) {
      return res.status(403).json({ error: "Unauthorized access. Missing institute." });
    }

    const FileModel = getFileModel(institute);
    const query = role === "student" ? { regdNo, institute } : {};
    const docs = await FileModel.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      documents: docs,
      count: docs.length,
    });
  } catch (err) {
    logger.error("❌ Failed to fetch documents:", err);
    return res.status(500).json({ error: "Server error while fetching documents." });
  }
};