const request = require('supertest');
const mongoose = require('mongoose');
const { app, connectDB } = require('../src/app');
const config = require('../src/config');

// Test database connection
beforeAll(async () => {
  await connectDB();
});

// Close database connection after tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication API', () => {
  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/test-admin', () => {
    it('should require valid JWT token', async () => {
      const response = await request(app)
        .get('/api/admin/test-admin');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should accept valid JWT token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/admin/test-admin')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/test-public', () => {
    it('should require valid static token', async () => {
      const response = await request(app)
        .get('/api/admin/test-public');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should accept valid static token', async () => {
      const response = await request(app)
        .get('/api/admin/test-public')
        .set('Authorization', `Bearer ${config.staticUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Health Check', () => {
  it('should return server status', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is running');
  });
});

