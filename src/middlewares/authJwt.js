const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token for admin/editor routes
 */
const verifyAdminOrEditor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = await authService.verifyToken(token);
      
      // Add user info to request object
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        username: decoded.username
      };
      
      logger.debug('Admin/Editor token verified', { 
        userId: decoded.userId, 
        role: decoded.role 
      });
      
      next();
    } catch (error) {
      logger.warn('Invalid JWT token', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        error: error.message 
      });
      
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error.' 
    });
  }
};

/**
 * Middleware to verify static user token for public routes
 */
const verifyStaticUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!authService.verifyStaticToken(token)) {
      logger.warn('Invalid static token', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    
    logger.debug('Static token verified', { ip: req.ip });
    next();
  } catch (error) {
    logger.error('Static auth middleware error', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error.' 
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn('Admin access required', { 
      userId: req.user?.userId, 
      role: req.user?.role 
    });
    
    return res.status(403).json({ 
      error: 'Admin access required.' 
    });
  }
};

/**
 * Middleware to check if user has admin or editor role
 */
const requireAdminOrEditor = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
    next();
  } else {
    logger.warn('Admin or Editor access required', { 
      userId: req.user?.userId, 
      role: req.user?.role 
    });
    
    return res.status(403).json({ 
      error: 'Admin or Editor access required.' 
    });
  }
};

module.exports = {
  verifyAdminOrEditor,
  verifyStaticUser,
  requireAdmin,
  requireAdminOrEditor
};

