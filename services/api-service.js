const { ethers } = require("ethers");
const config = require("../loaders/config");
const contractABI = require("../contracts/AcademicCertificateABI.json");

const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, provider);

/**
 * ✅ Issues a certificate and returns { success, txHash, certId }
 */
async function issueCertificate(certData, signer) {
  try {
    const { studentId, fileHash } = certData;
    if (!studentId || !fileHash) throw new Error("Missing studentId or fileHash");
    if (!signer || typeof signer.sendTransaction !== "function") throw new Error("Invalid signer");

    const contractWithSigner = contract.connect(signer);

    // Send transaction
    const tx = await contractWithSigner.issueCertificate(studentId, fileHash, {
      gasLimit: config.ethereum.gasLimit ? BigInt(config.ethereum.gasLimit) : 300_000n,
    });

    console.log(`📤 Blockchain Tx Sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("❌ Transaction failed on-chain");

    // Extract certId from event logs
    let certId = null;
    try {
      const parsedLog = receipt.logs
        .map(log => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find(log => log && log.name === "CertificateIssued");
      certId = parsedLog ? parsedLog.args[0].toString() : null;
    } catch {
      console.warn("⚠ Could not parse CertificateIssued event, falling back to certificateCount");
      const count = await contract.certificateCount();
      certId = (count - 1n).toString();
    }

    console.log("✅ Certificate successfully issued on-chain, CertID:", certId);

    return { success: true, txHash: tx.hash, certId };
  } catch (error) {
    console.error("❌ Error issuing certificate:", error.message);
    throw new Error("Blockchain certificate issuance failed.");
  }
}

module.exports = { issueCertificate };
