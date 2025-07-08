const { ethers } = require('ethers');
const Admin = require('../database/models/AdminDB');
const Student = require('../database/models/Student');
const { getFileModel } = require('../database/models/FileSchema');
const encryption = require('./encryption');
const config = require('../loaders/config');
const contractABI = require('../contracts/AcademicCertificateABI.json');

const provider = new ethers.providers.JsonRpcProvider(config.ethereum.rpcUrl);
const wallet = new ethers.Wallet(config.ethereum.privateKey, provider);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, wallet);

async function issueDocument({ title, fileBuffer, studentEmail, adminEmail, url }) {
  const admin = await Admin.findOne({ email: adminEmail });
  if (!admin) throw new Error("Admin not found");

  const student = await Student.findOne({ email: studentEmail });
  if (!student) throw new Error("Student not found");

  const hash = await encryption.computeSHA256(fileBuffer);
  const studentId = `${student.regdNo}@${admin.institute}`;

  // ✅ Blockchain transaction
  const tx = await contract.issueCertificate(studentId, hash, {
    gasLimit: 300000n
  });
  await tx.wait();

  const count = await contract.certificateCount();
  const certId = (count - 1n).toString();

  // ✅ Save in DB
  const File = getFileModel(admin.institute);
  const fileRecord = await File.create({
    title,
    url,
    hash,
    studentName: student.name,
    studentEmail: student.email,
    regdNo: student.regdNo,
    institute: admin.institute,
    uploadedBy: 'admin',
    issuer: admin.institute,
    issuedAt: new Date()
  });

  return {
    document: fileRecord,
    blockchain: {
      certId,
      txHash: tx.hash
    }
  };
}

module.exports = { issueDocument };
