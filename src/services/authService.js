const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
   * Verify static user token (legacy method - kept for backward compatibility)
   * @param {string} token 
   * @returns {boolean}
   */
  verifyStaticToken(token) {
    return token === config.staticUserToken;
  }

  /**
   * Generate encryption key from static token using SHA-256
   * @param {string} staticToken 
   * @returns {Buffer}
   */
  _deriveKey(staticToken) {
    return crypto.createHash('sha256').update(staticToken).digest();
  }

  /**
   * Generate encrypted user token
   * Format: Encrypts "STATIC_USER_TOKEN|yyyy-mm-dd hh:mm:ss" using AES-256-CBC
   * @param {string} staticToken - The static token to encrypt
   * @param {Date|string} timestamp - Date object or formatted string "yyyy-mm-dd hh:mm:ss"
   * @returns {string} Base64 encoded encrypted token (IV + ciphertext)
   */
  generateUserToken(staticToken, timestamp) {
    try {
      // Format timestamp if it's a Date object
      let timeString;
      if (timestamp instanceof Date) {
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(timestamp.getSeconds()).padStart(2, '0');
        timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } else {
        timeString = timestamp;
      }

      // Create plaintext: "STATIC_USER_TOKEN|yyyy-mm-dd hh:mm:ss"
      const plaintext = `${staticToken}|${timeString}`;

      // Derive 32-byte key from static token
      const key = this._deriveKey(staticToken);

      // Generate random 16-byte IV
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      // Encrypt: plaintext -> encrypted buffer
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Prepend IV to encrypted data and encode as base64
      const token = Buffer.concat([iv, encrypted]).toString('base64');

      return token;
    } catch (error) {
      logger.error('Failed to generate user token', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify encrypted user token
   * Decrypts token, extracts static token and timestamp, then validates
   * @param {string} encryptedToken - Base64 encoded encrypted token
   * @returns {{ isValid: boolean, tokenTime: Date, tokenTimeString: string, timeDiffSeconds: number }}
   * @throws {Error} If token is invalid, expired, or decryption fails
   */
  verifyUserToken(encryptedToken) {
    try {
      if (!encryptedToken || typeof encryptedToken !== 'string') {
        throw new Error('Invalid token format');
      }

      // Decode base64
      let tokenBuffer;
      try {
        tokenBuffer = Buffer.from(encryptedToken, 'base64');
      } catch (error) {
        throw new Error('Invalid token encoding');
      }

      // Extract IV (first 16 bytes) and ciphertext (rest)
      if (tokenBuffer.length < 16) {
        throw new Error('Invalid token length');
      }

      const iv = tokenBuffer.slice(0, 16);
      const ciphertext = tokenBuffer.slice(16);

      // Derive key from static token in config
      const key = this._deriveKey(config.staticUserToken);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      // Decrypt: encrypted buffer -> plaintext
      let decrypted;
      try {
        decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        decrypted = decrypted.toString('utf8');
      } catch (error) {
        throw new Error('Decryption failed');
      }

      // Parse decrypted data: "STATIC_USER_TOKEN|yyyy-mm-dd hh:mm:ss"
      const parts = decrypted.split('|');
      if (parts.length !== 2) {
        throw new Error('Invalid token format');
      }

      const [staticToken, timeString] = parts;

      // Verify static token matches config
      if (staticToken !== config.staticUserToken) {
        logger.warn('Token static token mismatch', { 
          received: staticToken.substring(0, 10) + '...' 
        });
        throw new Error('Invalid token');
      }

      // Parse timestamp
      const timestampRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
      const match = timeString.match(timestampRegex);
      if (!match) {
        throw new Error('Invalid timestamp format');
      }

      const [, year, month, day, hours, minutes, seconds] = match;
      const tokenTime = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );

      // Check if timestamp is valid
      if (isNaN(tokenTime.getTime())) {
        throw new Error('Invalid timestamp');
      }

      // Get current time and calculate difference
      const now = new Date();
      const timeDiffSeconds = Math.abs((now - tokenTime) / 1000);

      // Get expiry threshold from config (default 30 seconds)
      const expirySeconds = config.userTokenExpirySeconds || 30;

      // Check if token is within valid time window
      if (timeDiffSeconds > expirySeconds) {
        logger.warn('Token expired', { 
          timeDiffSeconds: Math.round(timeDiffSeconds),
          expirySeconds,
          tokenTime: timeString,
          serverTime: now.toISOString()
        });
        throw new Error('Token expired');
      }

      const timeDiffRounded = Math.round(timeDiffSeconds);

      logger.debug('User token verified successfully', {
        timeDiffSeconds: timeDiffRounded,
        tokenTime: timeString
      });

      return {
        isValid: true,
        tokenTime,
        tokenTimeString: timeString,
        timeDiffSeconds: timeDiffRounded
      };
    } catch (error) {
      if (error.message === 'Token expired' || error.message === 'Invalid token' || error.message === 'Decryption failed') {
        throw error;
      }
      logger.error('Token verification failed', { error: error.message });
      throw new Error('Invalid token');
    }
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

