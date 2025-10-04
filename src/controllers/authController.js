const authService = require('../services/authService');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Admin login controller
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await authService.login(username, password);
    
    res.json({
      success: true,
      token: result.token,
      role: result.role,
      userId: result.userId
    });
  } catch (error) {
    logger.error('Login failed', { 
      username, 
      error: error.message,
      ip: req.ip 
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

/**
 * Test endpoint for admin/editor authentication
 */
const testAdminAuth = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Admin/Editor authentication successful',
    user: req.user
  });
});

/**
 * Test endpoint for static user authentication
 */
const testStaticAuth = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Static user authentication successful',
    ip: req.ip
  });
});

module.exports = {
  login,
  testAdminAuth,
  testStaticAuth
};

