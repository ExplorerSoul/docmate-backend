const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const CertificateRegistry = await ethers.getContractFactory("AcademicCertificate");
  const contract = await CertificateRegistry.deploy();

  await contract.waitForDeployment(); // ✅ ensure deployment is mined

  const contractAddress = contract.target;
  console.log("✅ CertificateRegistry deployed at:", contractAddress);

  // Save address for frontend/backend
  const outputPath = path.resolve(__dirname, "../contracts/contract-address.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true }); // ✅ create folder if needed
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ CertificateRegistry: contractAddress }, null, 2)
  );

  console.log("📦 Contract address saved to contracts/contract-address.json");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
