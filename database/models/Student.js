const mongoose = require('mongoose');
const validator = require('validator');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  regdNo: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    }
  },
  password: { type: String, required: true },
  institute: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    default: 'student',
    enum: ['student']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
}, { timestamps: true });

// ✅ Scoped uniqueness
studentSchema.index({ email: 1, institute: 1 }, { unique: true });
studentSchema.index({ regdNo: 1, institute: 1 }, { unique: true });

// ✅ Dynamic Model Export
const getStudentModel = (institute) => {
  const modelName = `Student_${institute.toLowerCase()}`;
  return mongoose.models[modelName] || mongoose.model(modelName, studentSchema);
};

module.exports = { getStudentModel };
