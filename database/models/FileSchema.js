const mongoose = require('mongoose');
const validator = require('validator');

/**
 * Schema to represent a file/document uploaded by admin or student.
 * Used with S3 storage + blockchain hash verification.
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

  hash: {
    type: String,
    required: true,
    trim: true,
    unique: true, // If same document isn't reused across institutes
    // Description: SHA-256 hash of the document used for blockchain verification
  },

  url: {
    type: String,
    required: true, // S3 public or signed URL
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
    required: true, // Ethereum address of admin
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
    default: true // Default true for admin uploads
  }

}, { timestamps: true });

/**
 * ⚡ Indexes for faster queries
 */
fileSchema.index({ regdNo: 1, institute: 1 });
fileSchema.index({ studentEmail: 1, institute: 1 });
fileSchema.index({ hash: 1, institute: 1 }, { unique: true });

/**
 * 💡 Returns a Mongoose model scoped to a specific institute.
 * Each institute has its own collection (e.g., files_iitg, files_nitk).
 */
function getFileModel(institute) {
  if (!institute || typeof institute !== 'string') {
    throw new Error('Valid institute name is required');
  }

  const safeName = institute.trim().toLowerCase().replace(/\s+/g, '_');
  const modelName = `File_${safeName}`;          // Mongoose model name
  const collectionName = `files_${safeName}`;    // MongoDB collection name

  return mongoose.models[modelName] || mongoose.model(modelName, fileSchema, collectionName);
}

module.exports = { getFileModel };
