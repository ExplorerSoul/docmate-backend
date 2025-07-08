const { ethers } = require("ethers");
const config = require("../loaders/config"); // ✅ Correct config path
const contractABI = require("../contracts/AcademicCertificateABI.json"); // ✅ Your ABI file

// ✅ Create a provider using RPC URL
const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);

// ✅ Create signer from private key (for sending transactions)
const signer = new ethers.Wallet(config.ethereum.privateKey, provider);

// ✅ Contract address (make sure .env has correct CONTRACT_ADDRESS)
const contractAddress = config.ethereum.contractAddress;

// ✅ Create contract instance
const contract = new ethers.Contract(contractAddress, contractABI, signer);

module.exports = contract;
