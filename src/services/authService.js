const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Authenticate admin user with username and password
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{token: string, role: string}>}
   */
  async login(username, password) {
    try {
      // Find user by username
      const user = await AdminUser.findOne({ username });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          role: user.role,
          username: user.username
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      logger.info(`Admin user ${username} logged in successfully`, {
        userId: user._id,
        role: user.role
      });

      return {
        token,
        role: user.role,
        userId: user._id
      };
    } catch (error) {
      logger.error('Login failed', { username, error: error.message });
      throw error;
    }
  }

  /**
   * Verify JWT token and return decoded payload
   * @param {string} token 
   * @returns {Promise<{userId: string, role: string, username: string}>}
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      return decoded;
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      throw new Error('Invalid token');
    }
  }

  /**
   * Verify static user token
   * @param {string} token 
   * @returns {boolean}
   */
  verifyStaticToken(token) {
    return token === config.staticUserToken;
  }

  /**
   * Create a new admin user (for setup purposes)
   * @param {string} username 
   * @param {string} password 
   * @param {string} role 
   * @returns {Promise<AdminUser>}
   */
  async createAdminUser(username, password, role = 'admin') {
    try {
      // Check if user already exists
      const existingUser = await AdminUser.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = new AdminUser({
        username,
        passwordHash,
        role
      });

      await user.save();

      logger.info(`New admin user created`, { username, role });

      return user;
    } catch (error) {
      logger.error('Failed to create admin user', { username, error: error.message });
      throw error;
    }
  }
}

module.exports = new AuthService();

