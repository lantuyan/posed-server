const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { app, connectDB } = require('../src/app');
const config = require('../src/config');
const Category = require('../src/models/Category');
const Image = require('../src/models/Image');

// Test database connection
beforeAll(async () => {
  await connectDB();
});

// Close database connection after tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up test data
afterEach(async () => {
  await Category.deleteMany({});
  await Image.deleteMany({});
});

describe('Categories API', () => {
  let adminToken;
  let staticToken;

  beforeAll(async () => {
    // Get admin token
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    adminToken = loginResponse.body.token;
    staticToken = config.staticUserToken;
  });

  describe('POST /api/categories', () => {
    it('should create a new category with admin token', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Nature',
          description: 'Nature photos'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.category.title).toBe('Nature');
      expect(response.body.category.description).toBe('Nature photos');
      expect(response.body.category.status).toBe(true);
    });

    it('should reject creation without admin token', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({
          title: 'Nature',
          description: 'Nature photos'
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create test categories
      await Category.create([
        { title: 'Nature', description: 'Nature photos', status: true },
        { title: 'City', description: 'City photos', status: true },
        { title: 'Archived', description: 'Archived photos', status: false }
      ]);
    });

    it('should get all active categories with static token', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalItems).toBe(2);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toHaveProperty('title');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/categories?page=1&limit=1')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
      expect(response.body.totalPages).toBe(2);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.items).toHaveLength(1);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/categories?search=nature')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(1);
      expect(response.body.items[0].title).toBe('Nature');
    });
  });

  describe('GET /api/categories/:id', () => {
    let categoryId;

    beforeEach(async () => {
      const category = await Category.create({
        title: 'Test Category',
        description: 'Test description',
        status: true
      });
      categoryId = category._id;
    });

    it('should get category by ID with images', async () => {
      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.category.title).toBe('Test Category');
      expect(response.body.images).toBeDefined();
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/categories/${fakeId}`)
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/categories/:id', () => {
    let categoryId;

    beforeEach(async () => {
      const category = await Category.create({
        title: 'Original Title',
        description: 'Original description',
        status: true
      });
      categoryId = category._id;
    });

    it('should update category with admin token', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.category.title).toBe('Updated Title');
    });

    it('should reject update without admin token', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    let categoryId;

    beforeEach(async () => {
      const category = await Category.create({
        title: 'To Delete',
        description: 'Will be deleted',
        status: true
      });
      categoryId = category._id;
    });

    it('should soft delete category with admin token', async () => {
      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const category = await Category.findById(categoryId);
      expect(category.status).toBe(false);
    });

    it('should reject delete without admin token', async () => {
      const response = await request(app)
        .delete(`/api/categories/${categoryId}`);

      expect(response.status).toBe(401);
    });
  });
});

describe('Images API', () => {
  let adminToken;
  let staticToken;
  let categoryId;

  beforeAll(async () => {
    // Get admin token
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    adminToken = loginResponse.body.token;
    staticToken = config.staticUserToken;

    // Create test category
    const category = await Category.create({
      title: 'Test Category',
      description: 'Test description',
      status: true
    });
    categoryId = category._id;
  });

  describe('POST /api/images', () => {
    it('should upload image with admin token', async () => {
      // Mock the imageService to avoid sharp processing issues in tests
      const originalGetImageMetadata = require('../src/services/imageService').getImageMetadata;
      require('../src/services/imageService').getImageMetadata = jest.fn().mockResolvedValue({
        width: 800,
        height: 600,
        size: 1024,
        mimeType: 'image/jpeg'
      });

      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, 'fake-image-data');

      const response = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Test Image')
        .field('description', 'Test description')
        .field('categoryIds', categoryId.toString())
        .attach('images', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.images).toHaveLength(1);
      expect(response.body.images[0].title).toBe('Test Image');

      // Restore original function
      require('../src/services/imageService').getImageMetadata = originalGetImageMetadata;

      // Clean up
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should reject upload without admin token', async () => {
      const response = await request(app)
        .post('/api/images')
        .send({
          title: 'Test Image'
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid file type', async () => {
      // Create a test text file
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'not an image');

      const response = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Test Image')
        .attach('images', testFilePath);

      expect(response.status).toBe(400);

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  describe('GET /api/images', () => {
    beforeEach(async () => {
      // Create test images
      await Image.create([
        {
          title: 'Image 1',
          description: 'First image',
          filePath: '/test/path1.jpg',
          fileName: 'image1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          width: 800,
          height: 600,
          categoryIds: [categoryId],
          status: true,
          countUsage: 10,
          countFavorite: 5
        },
        {
          title: 'Image 2',
          description: 'Second image',
          filePath: '/test/path2.jpg',
          fileName: 'image2.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          width: 1200,
          height: 800,
          categoryIds: [categoryId],
          status: true,
          countUsage: 20,
          countFavorite: 8
        }
      ]);
    });

    it('should get all images with static token', async () => {
      const response = await request(app)
        .get('/api/images')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalItems).toBe(2);
      expect(response.body.items).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/images?page=1&limit=1')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
      expect(response.body.totalPages).toBe(2);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.items).toHaveLength(1);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/images?search=first')
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(1);
      expect(response.body.items[0].title).toBe('Image 1');
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get(`/api/images?categoryId=${categoryId}`)
        .set('Authorization', `Bearer ${staticToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
    });
  });
});

describe('Public Increment API', () => {
  let staticToken;
  let imageId;

  beforeAll(async () => {
    staticToken = config.staticUserToken;

    // Create test image
    const image = await Image.create({
      title: 'Test Image',
      description: 'Test description',
      filePath: '/test/path.jpg',
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 800,
      height: 600,
      categoryIds: [],
      status: true,
      countUsage: 0,
      countFavorite: 0
    });
    imageId = image._id;
  });

  describe('POST /api/public/images/:id/increment', () => {
    it('should increment counters with static token', async () => {
      const response = await request(app)
        .post(`/api/public/images/${imageId}/increment`)
        .set('Authorization', `Bearer ${staticToken}`)
        .send({
          incrementUsage: 1,
          incrementFavorite: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.image.countUsage).toBe(1);
      expect(response.body.image.countFavorite).toBe(2);
    });

    it('should reject without static token', async () => {
      const response = await request(app)
        .post(`/api/public/images/${imageId}/increment`)
        .send({
          incrementUsage: 1
        });

      expect(response.status).toBe(401);
    });

    it('should validate increment values', async () => {
      const response = await request(app)
        .post(`/api/public/images/${imageId}/increment`)
        .set('Authorization', `Bearer ${staticToken}`)
        .send({
          incrementUsage: -1
        });

      expect(response.status).toBe(400);
    });

    it('should require at least one increment', async () => {
      const response = await request(app)
        .post(`/api/public/images/${imageId}/increment`)
        .set('Authorization', `Bearer ${staticToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
