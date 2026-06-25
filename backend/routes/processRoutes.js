const express = require('express');
const router = express.Router();
const Process = require('../models/Process');

// ============ GET ALL PROCESSES ============
router.get('/', async (req, res) => {
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

// ============ GET SINGLE PROCESS ============
router.get('/:id', async (req, res) => {
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

// ============ CREATE NEW PROCESS ============
router.post('/', async (req, res) => {
  try {
    const { processId, arrivalTime, burstTime, priority } = req.body;
    
    // Validate required fields
    if (!processId || arrivalTime === undefined || burstTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: processId, arrivalTime, burstTime'
      });
    }
    
    // Check if process already exists
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

// ============ UPDATE PROCESS ============
router.put('/:id', async (req, res) => {
  try {
    const { arrivalTime, burstTime, priority, status, waitTime, turnaroundTime, completionTime } = req.body;
    const updateData = {};
    
    if (arrivalTime !== undefined) updateData.arrivalTime = parseInt(arrivalTime);
    if (burstTime !== undefined) updateData.burstTime = parseInt(burstTime);
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (status !== undefined) updateData.status = status;
    if (waitTime !== undefined) updateData.waitTime = parseInt(waitTime);
    if (turnaroundTime !== undefined) updateData.turnaroundTime = parseInt(turnaroundTime);
    if (completionTime !== undefined) updateData.completionTime = parseInt(completionTime);
    
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

// ============ DELETE SINGLE PROCESS ============
router.delete('/:id', async (req, res) => {
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

// ============ DELETE ALL PROCESSES ============
router.delete('/', async (req, res) => {
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

// ============ BULK CREATE PROCESSES ============
router.post('/bulk', async (req, res) => {
  try {
    const { processes } = req.body;
    
    if (!processes || !Array.isArray(processes) || processes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of processes'
      });
    }
    
    // Validate each process
    const validProcesses = [];
    const errors = [];
    
    for (const p of processes) {
      if (!p.processId || p.arrivalTime === undefined || p.burstTime === undefined) {
        errors.push(`Missing fields for process: ${JSON.stringify(p)}`);
        continue;
      }
      
      // Check for duplicates
      const existing = await Process.findOne({ processId: p.processId });
      if (existing) {
        errors.push(`Process '${p.processId}' already exists`);
        continue;
      }
      
      validProcesses.push({
        processId: p.processId.trim(),
        arrivalTime: parseInt(p.arrivalTime),
        burstTime: parseInt(p.burstTime),
        priority: parseInt(p.priority) || 5,
        status: 'ready'
      });
    }
    
    if (validProcesses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid processes to create',
        details: errors
      });
    }
    
    const created = await Process.insertMany(validProcesses);
    
    res.status(201).json({
      success: true,
      message: `Created ${created.length} processes`,
      data: created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GET PROCESS STATISTICS ============
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, ready, running, waiting, completed] = await Promise.all([
      Process.countDocuments(),
      Process.countDocuments({ status: 'ready' }),
      Process.countDocuments({ status: 'running' }),
      Process.countDocuments({ status: 'waiting' }),
      Process.countDocuments({ status: 'completed' })
    ]);
    
    // Get average burst time
    const burstAgg = await Process.aggregate([
      { $group: { _id: null, avgBurst: { $avg: '$burstTime' }, maxBurst: { $max: '$burstTime' }, minBurst: { $min: '$burstTime' } } }
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        ready,
        running,
        waiting,
        completed,
        avgBurstTime: burstAgg[0]?.avgBurst || 0,
        maxBurstTime: burstAgg[0]?.maxBurst || 0,
        minBurstTime: burstAgg[0]?.minBurst || 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;