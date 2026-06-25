const express = require('express');
const router = express.Router();
const Process = require('../models/Process');
const Simulation = require('../models/Simulation');

// ============ HELPER FUNCTIONS ============

// Generate random color for Gantt chart
function getColor(index, total) {
  const hue = (index * 360 / total) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// ============ GET ALL SIMULATIONS ============
router.get('/', async (req, res) => {
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

// ============ GET SINGLE SIMULATION ============
router.get('/:id', async (req, res) => {
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

// ============ SAVE SIMULATION RESULT ============
router.post('/', async (req, res) => {
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

// ============ DELETE SIMULATION ============
router.delete('/:id', async (req, res) => {
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

// ============ GET ALGORITHM METRICS ============
router.get('/metrics/:algorithm', async (req, res) => {
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
          totalSimulations: { $sum: 1 },
          maxWaitTime: { $max: '$results.avgWaitTime' },
          minWaitTime: { $min: '$results.avgWaitTime' },
          totalProcessesProcessed: { $sum: '$results.totalProcesses' }
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

// ============ RUN FCFS SIMULATION ============
router.post('/fcfs', async (req, res) => {
  try {
    const processes = await Process.find().sort({ arrivalTime: 1 });
    
    if (processes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first.'
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
    
    await simulation.save();
    
    res.json({
      success: true,
      message: 'FCFS simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('FCFS Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ RUN SJF SIMULATION ============
router.post('/sjf', async (req, res) => {
  try {
    const processes = await Process.find().sort({ arrivalTime: 1 });
    
    if (processes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first.'
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
      // Find available processes
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
      
      // Select process with shortest burst time
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
    
    await simulation.save();
    
    res.json({
      success: true,
      message: 'SJF simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('SJF Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ RUN ROUND ROBIN SIMULATION ============
router.post('/rr', async (req, res) => {
  try {
    const { timeQuantum } = req.body;
    const quantum = parseInt(timeQuantum) || 2;
    
    const processes = await Process.find().sort({ arrivalTime: 1 });
    
    if (processes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first.'
      });
    }
    
    let currentTime = 0;
    let completed = 0;
    const queue = [];
    const remainingTime = new Map();
    const waitTime = new Map();
    const responseTime = new Map();
    const ganttChart = [];
    const processIds = [];
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    
    processes.forEach(p => {
      remainingTime.set(p.processId, p.burstTime);
      waitTime.set(p.processId, 0);
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
        waitTime.set(pid, wait);
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
    
    await simulation.save();
    
    res.json({
      success: true,
      message: 'Round Robin simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('Round Robin Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ RUN PRIORITY SIMULATION ============
router.post('/priority', async (req, res) => {
  try {
    const processes = await Process.find().sort({ arrivalTime: 1 });
    
    if (processes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processes found. Please add some processes first.'
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
      // Find available processes (higher priority = lower number)
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
      
      // Select process with highest priority (lowest number)
      const selected = available.reduce((a, b) => 
        a.priority < b.priority ? a : b
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
      simulationId: `SIM-PRIORITY-${Date.now()}`,
      algorithm: 'priority',
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
    
    await simulation.save();
    
    res.json({
      success: true,
      message: 'Priority simulation completed',
      data: simulation
    });
    
  } catch (error) {
    console.error('Priority Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GET DASHBOARD STATS ============
router.get('/stats/dashboard', async (req, res) => {
  try {
    const [totalProcesses, completedProcesses, totalSimulations, latestSimulation] = await Promise.all([
      Process.countDocuments(),
      Process.countDocuments({ status: 'completed' }),
      Simulation.countDocuments(),
      Simulation.findOne().sort({ createdAt: -1 }).populate('processes', 'processId')
    ]);
    
    res.json({
      success: true,
      data: {
        totalProcesses,
        completedProcesses,
        activeProcesses: totalProcesses - completedProcesses,
        totalSimulations,
        latestSimulation: latestSimulation || null
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ SEED SAMPLE DATA ============
router.post('/seed', async (req, res) => {
  try {
    // Clear existing data
    await Process.deleteMany({});
    
    // Insert sample processes
    const sampleProcesses = [
      { processId: 'P1', arrivalTime: 0, burstTime: 6, priority: 3 },
      { processId: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { processId: 'P3', arrivalTime: 2, burstTime: 8, priority: 2 },
      { processId: 'P4', arrivalTime: 3, burstTime: 3, priority: 4 },
      { processId: 'P5', arrivalTime: 4, burstTime: 5, priority: 2 }
    ];
    
    const processes = await Process.insertMany(sampleProcesses);
    
    res.json({
      success: true,
      message: `Seeded ${processes.length} sample processes`,
      data: processes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;