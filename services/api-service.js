const { ethers } = require("ethers");
const config = require("../loaders/config");
const contractABI = require("../contracts/AcademicCertificateABI.json");

const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
const contract = new ethers.Contract(config.ethereum.contractAddress, contractABI, provider);

/**
 * ✅ Issues a certificate and returns { success, txHash, certId }
 * @param {Object} certData - { studentId, fileHash }
 * @param {ethers.Signer} signer - signer connected to provider
 */
async function issueCertificate(certData, signer) {
  try {
    const { studentId, fileHash } = certData;

    if (!studentId || !fileHash) {
      throw new Error("Missing studentId or fileHash");
    }

    if (!signer || typeof signer.sendTransaction !== "function") {
      throw new Error("Invalid signer. Must be a connected wallet instance.");
    }

    const contractWithSigner = contract.connect(signer);

    // Send transaction
    const tx = await contractWithSigner.issueCertificate(studentId, fileHash, {
      gasLimit: 300_000n, // BigInt for ethers v6
    });

    console.log(`📤 Blockchain Tx Sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await provider.waitForTransaction(tx.hash);
    if (!receipt || receipt.status !== 1) {
      throw new Error("❌ Transaction failed on-chain");
    }

    console.log("✅ Certificate successfully issued on-chain");

    // Get certId = certificateCount - 1
    const count = await contract.certificateCount();
    const certId = (count - 1n).toString();

    return {
      success: true,
      txHash: tx.hash,
      certId,
    };
  } catch (error) {
    console.error("❌ Error issuing certificate:", error);
    throw new Error("Blockchain certificate issuance failed.");
  }
}

module.exports = {
  issueCertificate,
};
