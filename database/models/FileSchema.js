const mongoose = require('mongoose');
const validator = require('validator');

/**
 * File/Document schema for blockchain-integrated academic systems.
 * Handles single and batch uploads (Merkle-based).
 */
const fileSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  docType: {
    type: String,
    required: true, // E.g. degree, bonafide, etc.
    trim: true
  },

  hash: {
    type: String,
    required: true,
    trim: true,
    // keccak-256 hash of document (used in on-chain or Merkle validation)
  },

  url: {
    type: String,
    required: true, // Public S3 file URL
    trim: true
  },

  s3Key: {
    type: String,
    required: true, // S3 internal file path
    trim: true
  },

  studentName: {
    type: String,
    required: true,
    trim: true
  },

  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  },

  regdNo: {
    type: String,
    required: true,
    trim: true
  },

  institute: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  uploadedBy: {
    type: String,
    enum: ['admin', 'student'],
    default: 'admin'
  },

  issuer: {
    type: String,
    required: true, // Could be institute name or Ethereum address
    trim: true
  },

  issuedAt: {
    type: Date,
    default: Date.now
  },

  meta: {
    cgpa: { type: String, maxlength: 5 },
    department: { type: String, maxlength: 50 },
    roll: { type: String, maxlength: 10 },
    remarks: { type: String, maxlength: 255 }
  },

  isApproved: {
    type: Boolean,
    default: true
  },

  // ✅ Batch/Merkle-related fields
  isBatch: {
    type: Boolean,
    default: false
  },
  batchMerkleRoot: {
    type: String,
    default: null // Merkle root (0x...) if part of batch
  },
  batchId: {
    type: String,
    default: null // Optional: blockchain batch ID
  }

}, { timestamps: true });

/**
 * ⚡ Indexes for high-performance queries
 */
fileSchema.index({ regdNo: 1, institute: 1 });
fileSchema.index({ studentEmail: 1, institute: 1 });
fileSchema.index({ hash: 1, institute: 1 }, { unique: true }); // hash must be unique within an institute

/**
 * 💡 Returns Mongoose model scoped per institute (multi-tenant support)
 */
function getFileModel(institute) {
  if (!institute || typeof institute !== 'string') {
    throw new Error('Valid institute name is required');
  }

  const safeName = institute.trim().toLowerCase().replace(/\s+/g, '_');
  const modelName = `File_${safeName}`;
  const collectionName = `files_${safeName}`;

  return mongoose.models[modelName] || mongoose.model(modelName, fileSchema, collectionName);
}

module.exports = { getFileModel };
