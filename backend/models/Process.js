const mongoose = require('mongoose');

const ProcessSchema = new mongoose.Schema({
  processId: {
    type: String,
    required: true,
    unique: true,  // This already creates an index
    trim: true
  },
  arrivalTime: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  burstTime: {
    type: Number,
    required: true,
    min: 1,
    default: 5
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  status: {
    type: String,
    enum: ['ready', 'running', 'waiting', 'completed'],
    default: 'ready'
  },
  waitTime: {
    type: Number,
    default: 0
  },
  turnaroundTime: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number,
    default: 0
  },
  completionTime: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for better performance
// REMOVE THIS LINE - unique: true already creates the index
// ProcessSchema.index({ processId: 1 });
ProcessSchema.index({ status: 1 });
ProcessSchema.index({ userId: 1 });
ProcessSchema.index({ arrivalTime: 1 });

module.exports = mongoose.models.Process || mongoose.model('Process', ProcessSchema);