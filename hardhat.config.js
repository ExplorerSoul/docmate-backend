require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
  },
  networks: {
    hardhat: {}, // local development network

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  // Optional: For contract verification on Etherscan (if you want)
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
};
