const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ MONGODB CONNECTION ============
console.log('🔄 Connecting to MongoDB...');

const mongoURI = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URL not found in .env file');
  process.exit(1);
}

// Log connection (hide password)
const sanitizedURI = mongoURI.replace(/:[^:]*@/, ':****@');
console.log(`📡 Connecting to: ${sanitizedURI}`);

// Connection options
const options = {
  dbName: process.env.DB_NAME || 'CPU_SCHEDULING',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(mongoURI, options)
.then(() => {
  console.log('✅ Connected to MongoDB Atlas successfully!');
  console.log(`📊 Database: ${process.env.DB_NAME || 'CPU_SCHEDULING'}`);
  console.log(`📊 Host: ${mongoose.connection.host}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\n💡 Troubleshooting:');
  console.log('1. Make sure your IP is whitelisted in Atlas');
  console.log('2. Check username/password in connection string');
  console.log('3. If DNS error, use the direct connection string');
  console.log('4. Or use local MongoDB: mongodb://localhost:27017/CPU_SCHEDULING');
  process.exit(1);
});

// ============ IMPORT MODELS ============
const Process = require('./models/Process');
const Simulation = require('./models/Simulation');
const User = require('./models/User');

// ============ HELPER FUNCTIONS ============

function getColor(index, total) {
  const hue = (index * 360 / total) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: statusMap[dbStatus] || 'Unknown'
  });
});

// ============ ROOT ENDPOINT ============
app.get('/', (req, res) => {
  res.json({
    name: 'CPU Scheduling Dashboard API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: 'GET /api/health',
      processes: 'GET /api/processes',
      simulations: 'GET /api/simulations',
      seed: 'POST /api/seed'
    }
  });
});

// ============================================
// ============ PROCESS ROUTES ============
// ============================================

app.get('/api/processes', async (req, res) => {
  try {
    const processes = await Process.find().sort({ arrivalTime: 1, processId: 1 });
    res.json({
      success: true,
      count: processes.length,
      data: processes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/processes/:id', async (req, res) => {
  try {
    const process = await Process.findOne({ processId: req.params.id });
    if (!process) {
      return res.status(404).json({ 
        success: false, 
        error: 'Process not found' 
      });
    }
    res.json({
      success: true,
      data: process
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/processes', async (req, res) => {
  try {
    const { processId, arrivalTime, burstTime, priority } = req.body;
    
    if (!processId || arrivalTime === undefined || burstTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: processId, arrivalTime, burstTime'
      });
    }
    
    const existing = await Process.findOne({ processId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Process with ID '${processId}' already exists`
      });
    }
    
    const process = new Process({
      processId: processId.trim(),
      arrivalTime: parseInt(arrivalTime),
      burstTime: parseInt(burstTime),
      priority: parseInt(priority) || 5,
      status: 'ready'
    });
    
    await process.save();
    
    res.status(201).json({
      success: true,
      message: 'Process created successfully',
      data: process
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.put('/api/processes/:id', async (req, res) => {
  try {
    const { arrivalTime, burstTime, priority, status } = req.body;
    const updateData = {};
    
    if (arrivalTime !== undefined) updateData.arrivalTime = parseInt(arrivalTime);
    if (burstTime !== undefined) updateData.burstTime = parseInt(burstTime);
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (status !== undefined) updateData.status = status;
    
    const process = await Process.findOneAndUpdate(
      { processId: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!process) {
      return res.status(404).json({
        success: false,
        error: 'Process not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Process updated successfully',
      data: process
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.delete('/api/processes/:id', async (req, res) => {
  try {
    const process = await Process.findOneAndDelete({ processId: req.params.id });
    if (!process) {
      return res.status(404).json({
        success: false,
        error: 'Process not found'
      });
    }
    res.json({
      success: true,
      message: `Process '${req.params.id}' deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.delete('/api/processes', async (req, res) => {
  try {
    const result = await Process.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} processes`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ SIMULATION ROUTES ============
// ============================================

app.get('/api/simulations', async (req, res) => {
  try {
    const simulations = await Simulation.find()
      .sort({ createdAt: -1 })
      .populate('processes', 'processId arrivalTime burstTime priority');
    
    res.json({
      success: true,
      count: simulations.length,
      data: simulations
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/simulations/:id', async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.id)
      .populate('processes', 'processId arrivalTime burstTime priority');
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }
    
    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/simulations', async (req, res) => {
  try {
    const simulation = new Simulation({
      simulationId: req.body.simulationId || `SIM-${Date.now()}`,
      algorithm: req.body.algorithm,
      timeQuantum: req.body.timeQuantum || 2,
      processes: req.body.processes || [],
      results: req.body.results || {},
      ganttChart: req.body.ganttChart || [],
      userId: req.body.userId || null,
      duration: req.body.duration || 0
    });
    
    await simulation.save();
    
    res.status(201).json({
      success: true,
      message: 'Simulation saved successfully',
      data: simulation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.delete('/api/simulations/:id', async (req, res) => {
  try {
    const simulation = await Simulation.findByIdAndDelete(req.params.id);
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }
    res.json({
      success: true,
      message: 'Simulation deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/metrics/:algorithm', async (req, res) => {
  try {
    const metrics = await Simulation.aggregate([
      { $match: { algorithm: req.params.algorithm } },
      {
        $group: {
          _id: '$algorithm',
          avgWaitTime: { $avg: '$results.avgWaitTime' },
          avgTurnaroundTime: { $avg: '$results.avgTurnaroundTime' },
          avgResponseTime: { $avg: '$results.avgResponseTime' },
          avgCPUUtilization: { $avg: '$results.cpuUtilization' },
          totalSimulations: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: metrics[0] || { message: 'No simulations found for this algorithm' }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ SCHEDULING ALGORITHMS ============
// ============================================

app.post('/api/simulate/fcfs', async (req, res) => {
  try {
    console.log('📥 FCFS simulation started');
    
    const processes = await Process.find().sort({ arrivalTime: 1 });
    console.log(`📊 Found ${processes.length} processes in database`);
    
    if (processes.length === 0) {
      console.log('⚠️ No processes found!');
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first or seed data.'
      });
    }
    
    let currentTime = 0;
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    const ganttChart = [];
    const processIds = [];
    
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    sorted.forEach((process, index) => {
      const arrival = process.arrivalTime;
      const burst = process.burstTime;
      
      const waitTime = Math.max(0, currentTime - arrival);
      const startTime = Math.max(currentTime, arrival);
      const completionTime = startTime + burst;
      const turnaroundTime = completionTime - arrival;
      const responseTime = startTime - arrival;
      
      totalWaitTime += waitTime;
      totalTurnaroundTime += turnaroundTime;
      totalResponseTime += responseTime;
      
      ganttChart.push({
        processId: process.processId,
        start: startTime,
        end: completionTime,
        color: getColor(index, sorted.length)
      });
      
      processIds.push(process._id);
      currentTime = completionTime;
    });
    
    const count = processes.length;
    const avgWaitTime = totalWaitTime / count;
    const avgTurnaroundTime = totalTurnaroundTime / count;
    const avgResponseTime = totalResponseTime / count;
    const cpuUtilization = currentTime > 0 ? (currentTime / (currentTime + 1)) * 100 : 0;
    const throughput = currentTime > 0 ? (count / (currentTime / 1000)) : 0;
    
    const simulation = new Simulation({
      simulationId: `SIM-FCFS-${Date.now()}`,
      algorithm: 'fcfs',
      processes: processIds,
      results: {
        avgWaitTime: parseFloat(avgWaitTime.toFixed(2)),
        avgTurnaroundTime: parseFloat(avgTurnaroundTime.toFixed(2)),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        cpuUtilization: parseFloat(Math.min(cpuUtilization, 100).toFixed(2)),
        throughput: parseFloat(throughput.toFixed(2)),
        totalProcesses: count
      },
      ganttChart,
      duration: currentTime
    });
    
    console.log('💾 Saving FCFS simulation to database...');
    await simulation.save();
    console.log('✅ FCFS Simulation saved! ID:', simulation._id);
    
    res.json({
      success: true,
      message: 'FCFS simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('❌ FCFS Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/simulate/rr', async (req, res) => {
  try {
    const { timeQuantum } = req.body;
    const quantum = parseInt(timeQuantum) || 2;
    
    console.log(`📥 Round Robin simulation started (Quantum: ${quantum})`);
    
    const processes = await Process.find().sort({ arrivalTime: 1 });
    console.log(`📊 Found ${processes.length} processes in database`);
    
    if (processes.length === 0) {
      console.log('⚠️ No processes found!');
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first or seed data.'
      });
    }
    
    let currentTime = 0;
    let completed = 0;
    const queue = [];
    const remainingTime = new Map();
    const responseTime = new Map();
    const ganttChart = [];
    const processIds = [];
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    
    processes.forEach(p => {
      remainingTime.set(p.processId, p.burstTime);
      responseTime.set(p.processId, -1);
      processIds.push(p._id);
    });
    
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let index = 0;
    const colors = {};
    processes.forEach((p, i) => {
      colors[p.processId] = getColor(i, processes.length);
    });
    
    while (completed < processes.length) {
      while (index < sorted.length && sorted[index].arrivalTime <= currentTime) {
        queue.push(sorted[index]);
        index++;
      }
      
      if (queue.length === 0) {
        currentTime++;
        continue;
      }
      
      const process = queue.shift();
      const pid = process.processId;
      const remaining = remainingTime.get(pid);
      
      if (responseTime.get(pid) === -1) {
        responseTime.set(pid, currentTime - process.arrivalTime);
      }
      
      const executeTime = Math.min(quantum, remaining);
      const startTime = currentTime;
      const endTime = currentTime + executeTime;
      
      ganttChart.push({
        processId: pid,
        start: startTime,
        end: endTime,
        color: colors[pid]
      });
      
      currentTime = endTime;
      remainingTime.set(pid, remaining - executeTime);
      
      while (index < sorted.length && sorted[index].arrivalTime <= currentTime) {
        queue.push(sorted[index]);
        index++;
      }
      
      if (remainingTime.get(pid) > 0) {
        queue.push(process);
      } else {
        completed++;
        const turnaround = currentTime - process.arrivalTime;
        const wait = turnaround - process.burstTime;
        totalWaitTime += wait;
        totalTurnaroundTime += turnaround;
        totalResponseTime += responseTime.get(pid);
      }
    }
    
    const count = processes.length;
    const avgWaitTime = totalWaitTime / count;
    const avgTurnaroundTime = totalTurnaroundTime / count;
    const avgResponseTime = totalResponseTime / count;
    const cpuUtilization = currentTime > 0 ? (currentTime / (currentTime + 1)) * 100 : 0;
    const throughput = currentTime > 0 ? (count / (currentTime / 1000)) : 0;
    
    const simulation = new Simulation({
      simulationId: `SIM-RR-${Date.now()}`,
      algorithm: 'rr',
      timeQuantum: quantum,
      processes: processIds,
      results: {
        avgWaitTime: parseFloat(avgWaitTime.toFixed(2)),
        avgTurnaroundTime: parseFloat(avgTurnaroundTime.toFixed(2)),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        cpuUtilization: parseFloat(Math.min(cpuUtilization, 100).toFixed(2)),
        throughput: parseFloat(throughput.toFixed(2)),
        totalProcesses: count
      },
      ganttChart,
      duration: currentTime
    });
    
    console.log('💾 Saving Round Robin simulation to database...');
    await simulation.save();
    console.log('✅ Round Robin Simulation saved! ID:', simulation._id);
    
    res.json({
      success: true,
      message: 'Round Robin simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('❌ Round Robin Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/simulate/sjf', async (req, res) => {
  try {
    console.log('📥 SJF simulation started');
    
    const processes = await Process.find().sort({ arrivalTime: 1 });
    console.log(`📊 Found ${processes.length} processes in database`);
    
    if (processes.length === 0) {
      console.log('⚠️ No processes found!');
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first or seed data.'
      });
    }
    
    let currentTime = 0;
    let completed = 0;
    const ganttChart = [];
    const processIds = [];
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    const remainingTime = new Map();
    const responseTime = new Map();
    
    processes.forEach(p => {
      remainingTime.set(p.processId, p.burstTime);
      responseTime.set(p.processId, -1);
      processIds.push(p._id);
    });
    
    const colors = {};
    processes.forEach((p, i) => {
      colors[p.processId] = getColor(i, processes.length);
    });
    
    while (completed < processes.length) {
      let available = [];
      for (const p of processes) {
        if (remainingTime.get(p.processId) > 0 && p.arrivalTime <= currentTime) {
          available.push(p);
        }
      }
      
      if (available.length === 0) {
        currentTime++;
        continue;
      }
      
      const selected = available.reduce((a, b) => 
        remainingTime.get(a.processId) < remainingTime.get(b.processId) ? a : b
      );
      
      const pid = selected.processId;
      
      if (responseTime.get(pid) === -1) {
        responseTime.set(pid, currentTime - selected.arrivalTime);
      }
      
      const burst = remainingTime.get(pid);
      const startTime = currentTime;
      const endTime = currentTime + burst;
      
      ganttChart.push({
        processId: pid,
        start: startTime,
        end: endTime,
        color: colors[pid]
      });
      
      currentTime = endTime;
      remainingTime.set(pid, 0);
      completed++;
      
      const turnaround = currentTime - selected.arrivalTime;
      const wait = turnaround - selected.burstTime;
      totalWaitTime += wait;
      totalTurnaroundTime += turnaround;
      totalResponseTime += responseTime.get(pid);
    }
    
    const count = processes.length;
    const avgWaitTime = totalWaitTime / count;
    const avgTurnaroundTime = totalTurnaroundTime / count;
    const avgResponseTime = totalResponseTime / count;
    const cpuUtilization = currentTime > 0 ? (currentTime / (currentTime + 1)) * 100 : 0;
    const throughput = currentTime > 0 ? (count / (currentTime / 1000)) : 0;
    
    const simulation = new Simulation({
      simulationId: `SIM-SJF-${Date.now()}`,
      algorithm: 'sjf',
      processes: processIds,
      results: {
        avgWaitTime: parseFloat(avgWaitTime.toFixed(2)),
        avgTurnaroundTime: parseFloat(avgTurnaroundTime.toFixed(2)),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        cpuUtilization: parseFloat(Math.min(cpuUtilization, 100).toFixed(2)),
        throughput: parseFloat(throughput.toFixed(2)),
        totalProcesses: count
      },
      ganttChart,
      duration: currentTime
    });
    
    console.log('💾 Saving SJF simulation to database...');
    await simulation.save();
    console.log('✅ SJF Simulation saved! ID:', simulation._id);
    
    res.json({
      success: true,
      message: 'SJF simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('❌ SJF Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ USER ROUTES ============
// ============================================

app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password'
      });
    }
    
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }
    
    const user = new User({ username, email, password });
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password'
      });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    user.stats.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ SEED DATA ============
// ============================================

app.post('/api/seed', async (req, res) => {
  try {
    console.log('📦 Seeding data via POST...');
    
    await Process.deleteMany({});
    console.log('🗑️ Deleted existing processes');
    
    const sampleProcesses = [
      { processId: 'P1', arrivalTime: 0, burstTime: 6, priority: 3 },
      { processId: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { processId: 'P3', arrivalTime: 2, burstTime: 8, priority: 2 },
      { processId: 'P4', arrivalTime: 3, burstTime: 3, priority: 4 },
      { processId: 'P5', arrivalTime: 4, burstTime: 5, priority: 2 }
    ];
    
    const processes = await Process.insertMany(sampleProcesses);
    console.log(`✅ Seeded ${processes.length} sample processes`);
    
    res.json({
      success: true,
      message: `Seeded ${processes.length} sample processes`,
      data: processes
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/seed', async (req, res) => {
  try {
    console.log('📦 Seeding data via GET...');
    
    await Process.deleteMany({});
    console.log('🗑️ Deleted existing processes');
    
    const sampleProcesses = [
      { processId: 'P1', arrivalTime: 0, burstTime: 6, priority: 3 },
      { processId: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { processId: 'P3', arrivalTime: 2, burstTime: 8, priority: 2 },
      { processId: 'P4', arrivalTime: 3, burstTime: 3, priority: 4 },
      { processId: 'P5', arrivalTime: 4, burstTime: 5, priority: 2 }
    ];
    
    const processes = await Process.insertMany(sampleProcesses);
    console.log(`✅ Seeded ${processes.length} sample processes`);
    
    res.json({
      success: true,
      message: `Seeded ${processes.length} sample processes`,
      data: processes
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ DATABASE STATUS ============
// ============================================

app.get('/api/db-status', async (req, res) => {
  try {
    const processCount = await Process.countDocuments();
    const simulationCount = await Simulation.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        connected: mongoose.connection.readyState === 1,
        collections: {
          processes: processCount,
          simulations: simulationCount,
          users: userCount
        },
        totalDocuments: processCount + simulationCount + userCount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ============ 404 & ERROR HANDLING ============
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// ============ START SERVER ============
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'CPU_SCHEDULING'}`);
  console.log(`\n📌 Available Endpoints:`);
  console.log(`   GET  /api/health           - Health check`);
  console.log(`   GET  /api/db-status        - Database status`);
  console.log(`   GET  /api/processes        - Get all processes`);
  console.log(`   POST /api/processes        - Create process`);
  console.log(`   PUT  /api/processes/:id    - Update process`);
  console.log(`   DELETE /api/processes/:id  - Delete process`);
  console.log(`   DELETE /api/processes      - Delete all processes`);
  console.log(`   POST /api/simulate/fcfs    - Run FCFS simulation`);
  console.log(`   POST /api/simulate/rr      - Run Round Robin simulation`);
  console.log(`   POST /api/simulate/sjf     - Run SJF simulation`);
  console.log(`   POST /api/seed             - Seed sample data (POST)`);
  console.log(`   GET  /api/seed             - Seed sample data (GET)`);
  console.log(`   POST /api/users/register   - Register user`);
  console.log(`   POST /api/users/login      - Login user`);
  console.log(`   GET  /api/simulations      - Get all simulations`);
  console.log(`   GET  /api/metrics/:algo    - Get algorithm metrics`);
  console.log(`\n✨ Ready to accept requests!\n`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;