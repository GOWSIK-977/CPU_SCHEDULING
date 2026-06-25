const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema({
  simulationId: {
    type: String,
    unique: true,  // This already creates an index
    required: true
  },
  algorithm: {
    type: String,
    enum: ['fcfs', 'sjf', 'priority', 'rr', 'srtf'],
    required: true
  },
  timeQuantum: {
    type: Number,
    min: 1,
    default: 2
  },
  processes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Process'
  }],
  results: {
    avgWaitTime: { type: Number, default: 0 },
    avgTurnaroundTime: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    cpuUtilization: { type: Number, default: 0 },
    throughput: { type: Number, default: 0 },
    totalProcesses: { type: Number, default: 0 }
  },
  ganttChart: [{
    processId: { type: String },
    start: { type: Number },
    end: { type: Number },
    color: { type: String }
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  duration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create indexes
// REMOVE THIS LINE - unique: true already creates the index
// SimulationSchema.index({ simulationId: 1 });
SimulationSchema.index({ algorithm: 1 });
SimulationSchema.index({ userId: 1 });
SimulationSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Simulation || mongoose.model('Simulation', SimulationSchema);