# 📚 Swagger API Documentation Guide

## 🚀 Quick Start

Sau khi hoàn thành Sprint 2, hệ thống đã được tích hợp Swagger UI để dễ dàng test và kiểm tra các API endpoints.

### 🔗 Truy cập Swagger UI

**URL:** `http://localhost:3000/api-docs/`

### 🔐 Authentication

Swagger UI hỗ trợ 2 loại authentication:

#### 1. **BearerAuth (JWT Token)**
- Dùng cho admin/editor endpoints
- Lấy token từ `/api/admin/login`
- Click "Authorize" → chọn "BearerAuth" → nhập: `Bearer <your-jwt-token>`

#### 2. **StaticTokenAuth (Static Token)**
- Dùng cho public endpoints
- Token được cấu hình trong environment variables
- Click "Authorize" → chọn "StaticTokenAuth" → nhập: `Bearer <your-static-token>`

## 📋 API Endpoints Overview

### 🔐 Authentication (`/api/admin/*`)
- `POST /api/admin/login` - Đăng nhập admin/editor
- `GET /api/admin/test-admin` - Test JWT authentication
- `GET /api/admin/test-public` - Test static token authentication

### 📁 Categories (`/api/categories/*`)
- `POST /api/categories` - Tạo category mới (admin/editor)
- `GET /api/categories` - Lấy danh sách categories (public)
- `GET /api/categories/{id}` - Lấy chi tiết category + images (public)
- `PUT /api/categories/{id}` - Cập nhật category (admin/editor)
- `DELETE /api/categories/{id}` - Xóa category (admin/editor)

### 🖼️ Images (`/api/images/*`)
- `POST /api/images` - Upload images (admin/editor)
- `GET /api/images` - Lấy danh sách images (public)
- `GET /api/images/{id}` - Lấy chi tiết image (public)
- `PUT /api/images/{id}` - Cập nhật metadata image (admin/editor)
- `DELETE /api/images/{id}` - Xóa image (admin/editor)

### 🌐 Public (`/api/public/*`)
- `POST /api/public/images/{id}/increment` - Tăng counter usage/favorite (public)

## 🧪 Testing Workflow

### 1. **Test Authentication**
```bash
# 1. Login để lấy JWT token
POST /api/admin/login
{
  "username": "admin",
  "password": "your-password"
}

# 2. Copy token từ response
# 3. Authorize trong Swagger UI với BearerAuth
```

### 2. **Test Categories CRUD**
```bash
# 1. Tạo category mới
POST /api/categories
{
  "title": "Nature",
  "description": "Beautiful nature images"
}

# 2. Lấy danh sách categories
GET /api/categories?page=1&limit=20

# 3. Lấy chi tiết category
GET /api/categories/{categoryId}

# 4. Cập nhật category
PUT /api/categories/{categoryId}
{
  "title": "Updated Nature",
  "description": "Updated description"
}

# 5. Xóa category
DELETE /api/categories/{categoryId}
```

### 3. **Test Images Upload & CRUD**
```bash
# 1. Upload images
POST /api/images
# Form data:
# - images: [file1.jpg, file2.png]
# - title: "Sunset Beach"
# - description: "Beautiful sunset"
# - categoryIds: ["categoryId1", "categoryId2"]

# 2. Lấy danh sách images
GET /api/images?page=1&limit=20&search=sunset

# 3. Lấy chi tiết image
GET /api/images/{imageId}

# 4. Cập nhật metadata
PUT /api/images/{imageId}
{
  "title": "Updated Title",
  "description": "Updated description",
  "categoryIds": ["categoryId1"]
}

# 5. Xóa image
DELETE /api/images/{imageId}
```

### 4. **Test Public Increment**
```bash
# Tăng counter usage/favorite
POST /api/public/images/{imageId}/increment
{
  "incrementUsage": 1,
  "incrementFavorite": 1
}
```

## 🔧 Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h

# Static Token for Public API
STATIC_USER_TOKEN=your-static-token

# Upload Configuration
UPLOAD_PATH=uploads/images
MAX_IMAGE_SIZE=10485760  # 10MB

# API Base URL for Swagger
API_BASE_URL=http://localhost:3000
```

### Swagger Configuration
- **Title:** Pose Backend API
- **Version:** 1.0.0
- **Description:** API documentation for Pose Backend - Image and Category Management System
- **Server:** http://localhost:3000

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagination Response
```json
{
  "totalItems": 100,
  "totalPages": 5,
  "currentPage": 1,
  "items": [ ... ]
}
```

## 🚨 Common Issues

### 1. **401 Unauthorized**
- Kiểm tra token đã được authorize chưa
- Token có hết hạn không
- Token format đúng không (`Bearer <token>`)

### 2. **400 Bad Request**
- Kiểm tra request body format
- Kiểm tra required fields
- Kiểm tra data types

### 3. **413 Payload Too Large**
- File upload vượt quá giới hạn (10MB)
- Giảm kích thước file hoặc tăng MAX_IMAGE_SIZE

### 4. **429 Too Many Requests**
- Rate limit exceeded
- Chờ một chút rồi thử lại

## 🎯 Best Practices

1. **Luôn test authentication trước** khi test các endpoints khác
2. **Sử dụng pagination** cho các list endpoints
3. **Validate input** trước khi gửi request
4. **Kiểm tra response format** để đảm bảo API hoạt động đúng
5. **Sử dụng search và filter** để tìm kiếm dữ liệu hiệu quả

## 📝 Notes

- Swagger UI tự động lưu authorization tokens
- Có thể test trực tiếp từ Swagger UI mà không cần Postman
- Tất cả endpoints đều có validation và error handling
- File upload hỗ trợ multiple files
- Soft delete được sử dụng thay vì hard delete

---

**Happy Testing! 🚀**
