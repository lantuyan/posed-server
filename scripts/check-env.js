#!/usr/bin/env node

const mongoose = require('mongoose');
const config = require('../src/config');
const logger = require('../src/utils/logger');

async function checkEnvironment() {
  console.log('🔍 Checking development environment...\n');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  // Check MongoDB connection
  try {
    await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connection: OK');
    await mongoose.connection.close();
  } catch (error) {
    console.log('❌ MongoDB connection: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  // Check required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'STATIC_USER_TOKEN',
    'MONGODB_URI'
  ];
  
  console.log('\n📋 Environment variables:');
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
    }
  });
  
  // Check upload directory
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(process.cwd(), config.uploadPath);
  
  if (fs.existsSync(uploadsDir)) {
    console.log(`✅ Upload directory: ${uploadsDir}`);
  } else {
    console.log(`❌ Upload directory: ${uploadsDir} (not found)`);
  }
  
  console.log('\n🚀 Environment check complete!');
}

checkEnvironment().catch(console.error);
