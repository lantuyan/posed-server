#!/usr/bin/env node

require('dotenv').config();
const authService = require('../src/services/authService');
const config = require('../src/config');

/**
 * Generate encrypted user token for testing
 * 
 * Usage:
 *   node scripts/generate-user-token.js
 *   node scripts/generate-user-token.js "2024-01-15 14:30:00"
 */
function generateToken() {
  try {
    // Check if STATIC_USER_TOKEN is set
    if (!config.staticUserToken) {
      console.error('❌ Error: STATIC_USER_TOKEN is not set in .env file');
      process.exit(1);
    }

    // Get timestamp from command line argument or use current time
    let timestamp;
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Parse timestamp from command line: "yyyy-mm-dd hh:mm:ss"
      const timestampStr = args[0];
      const timestampRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
      const match = timestampStr.match(timestampRegex);
      
      if (!match) {
        console.error('❌ Error: Invalid timestamp format. Use: yyyy-mm-dd hh:mm:ss');
        console.error('   Example: 2024-01-15 14:30:00');
        process.exit(1);
      }
      
      const [, year, month, day, hours, minutes, seconds] = match;
      timestamp = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
      
      if (isNaN(timestamp.getTime())) {
        console.error('❌ Error: Invalid timestamp');
        process.exit(1);
      }
    } else {
      // Use current time
      timestamp = new Date();
    }

    // Format timestamp for display
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Generate token
    const token = authService.generateUserToken(config.staticUserToken, timestamp);

    // Output results
    console.log('\n🔐 User Token Generator\n');
    console.log('📋 Configuration:');
    console.log(`   Static Token: ${config.staticUserToken.substring(0, 10)}...`);
    console.log(`   Token Expiry: ±${config.userTokenExpirySeconds || 30} seconds`);
    console.log(`   Timestamp: ${timeString}`);
    console.log('\n✅ Generated Token:');
    console.log(`   ${token}`);
    console.log('\n📝 Usage:');
    console.log(`   curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/categories`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    process.exit(1);
  }
}

generateToken();

