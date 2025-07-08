const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const universitySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    },
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  publicKey: {
    type: String,
    required: true,
    unique: true,
    minlength: 10,
  },
}, {
  timestamps: true,
});

// Hash password before saving
universitySchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Static method to hash a password manually if needed
universitySchema.statics.saltAndHashPassword = async function (password) {
  try {
    return await bcrypt.hash(password, 10);
  } catch (err) {
    throw new Error('Password hashing failed');
  }
};

// Static method to validate login credentials
universitySchema.statics.validateByCredentials = async function (email, password) {
  const university = await this.findOne({ email });
  if (!university) throw new Error('Invalid login credentials');

  const isMatch = await bcrypt.compare(password, university.password);
  if (!isMatch) throw new Error('Invalid login credentials');

  return university;
};

// Indexing
universitySchema.index({ email: 1 }, { unique: true });
universitySchema.index({ publicKey: 1 }, { unique: true });

const University = mongoose.model('University', universitySchema);

module.exports = University;
