require('dotenv').config();
const path = require('path');

const env = process.env.NODE_ENV || 'development';

if (env === 'development') {
  // ✅ Use fallback for Mongo URI only if not defined
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/docmate';
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret', // fallback for dev only
  mongodbURI: process.env.MONGO_URI,
  port: process.env.PORT || 5000,
  logLevel: process.env.LOG_LEVEL || 'info',
  expressSessionSecret: process.env.EXPRESS_SESSION_SECRET || 'dev-session-secret',

  ethereum: {
    rpcUrl: process.env.SEPOLIA_RPC_URL || '',
    privateKey: process.env.PRIVATE_KEY || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '',
  },

  paths: {
    contractsBuildPath: path.resolve(__dirname, '..', 'contracts'),
  },
};
