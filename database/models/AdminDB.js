const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  institute: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin']
  },
  isVerified: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
