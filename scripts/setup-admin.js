const mongoose = require('mongoose');
const authService = require('../src/services/authService');
const config = require('../src/config');
const logger = require('../src/utils/logger');

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Connected to MongoDB');

    // Get admin credentials from command line arguments or use defaults
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const role = process.argv[4] || 'admin';

    // Create admin user
    const user = await authService.createAdminUser(username, password, role);
    
    console.log('✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Role: ${role}`);
    console.log(`User ID: ${user._id}`);
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    logger.error('Setup failed', { error: error.message });
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run setup
setupAdmin();

