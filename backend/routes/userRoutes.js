const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ============ REGISTER USER ============
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }
    
    // Create new user
    const user = new User({ 
      username: username.trim(), 
      email: email.trim().toLowerCase(), 
      password 
    });
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

// ============ LOGIN USER ============
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password'
      });
    }
    
    // Find user by username or email
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Update last login
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

// ============ GET USER PROFILE ============
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GET USER BY USERNAME ============
router.get('/username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ UPDATE USER PROFILE ============
router.put('/profile/:id', async (req, res) => {
  try {
    const { username, email, settings } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (settings) updateData.settings = settings;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ CHANGE PASSWORD ============
router.put('/change-password/:id', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ UPDATE USER STATS ============
router.post('/stats/:id', async (req, res) => {
  try {
    const { totalSimulations, totalProcesses } = req.body;
    const updateData = {};
    
    if (totalSimulations !== undefined) updateData['stats.totalSimulations'] = totalSimulations;
    if (totalProcesses !== undefined) updateData['stats.totalProcesses'] = totalProcesses;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: updateData },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ GET ALL USERS (Admin only - you can add auth middleware) ============
router.get('/admin/all', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ DELETE USER ============
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ CHECK USERNAME AVAILABILITY ============
router.get('/check-username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json({
      success: true,
      available: !user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ CHECK EMAIL AVAILABILITY ============
router.get('/check-email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json({
      success: true,
      available: !user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;