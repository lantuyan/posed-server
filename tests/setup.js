// Test setup file
const mongoose = require('mongoose');

// Increase timeout for database operations
jest.setTimeout(10000);

// Clean up after each test
afterEach(async () => {
  // Clean up any test data if needed
});

// Global test teardown
afterAll(async () => {
  // Close any remaining connections
});

