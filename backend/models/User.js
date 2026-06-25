const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,  // This already creates an index
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,  // This already creates an index
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'guest'],
    default: 'user'
  },
  settings: {
    theme: { type: String, default: 'dark' },
    defaultAlgorithm: { type: String, default: 'fcfs' },
    autoSave: { type: Boolean, default: true },
    simulationSpeed: { type: Number, default: 5, min: 1, max: 10 }
  },
  stats: {
    totalSimulations: { type: Number, default: 0 },
    totalProcesses: { type: Number, default: 0 },
    lastLogin: { type: Date }
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (exclude password)
UserSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// REMOVE THESE LINES - unique: true already creates the indexes
// UserSchema.index({ username: 1 }, { unique: true });
// UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);