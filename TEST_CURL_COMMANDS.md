# 🧪 Test CURL Commands cho Pose Backend APIs

## 📋 Chuẩn bị
```bash
# Khởi động server
npm run dev

# Các biến cần thiết
export BASE_URL="http://localhost:3000"
export STATIC_TOKEN="your-static-user-token-for-public-api-change-this-in-production"
```

## 🔐 1. Authentication APIs

### 1.1 Admin Login
```bash
# Login với admin user
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Login với editor user (nếu có)
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "editor",
    "password": "editor123"
  }'

# Test login sai password
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

### 1.2 Test Authentication Middlewares
```bash
# Test admin authentication (cần JWT token từ login response)
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Thay bằng token thật

curl -X GET http://localhost:3000/api/admin/test-admin \
  -H "Authorization: Bearer $JWT_TOKEN"

# Test static token authentication
curl -X GET http://localhost:3000/api/admin/test-public \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Test không có token (sẽ trả 401)
curl -X GET http://localhost:3000/api/admin/test-admin
```

## 📁 2. Categories APIs

### 2.1 Tạo Category (Admin/Editor)
```bash
# Tạo category mới
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nature Photos",
    "description": "Beautiful nature and landscape photos",
    "status": true
  }'

# Tạo category khác
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "City Life",
    "description": "Urban and city lifestyle photos",
    "status": true
  }'

# Test validation (thiếu title)
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Missing title"
  }'
```

### 2.2 Lấy danh sách Categories (Public)
```bash
# Lấy tất cả categories
curl -X GET http://localhost:3000/api/categories \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lấy categories với pagination
curl -X GET "http://localhost:3000/api/categories?page=1&limit=5" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Tìm kiếm categories
curl -X GET "http://localhost:3000/api/categories?search=nature" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lọc theo status
curl -X GET "http://localhost:3000/api/categories?status=true" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"
```

### 2.3 Lấy chi tiết Category (Public)
```bash
# Thay CATEGORY_ID bằng ID thật từ response trước
export CATEGORY_ID="68e0b11e6ab58e592ff05166" # Thay bằng ID thật

curl -X GET http://localhost:3000/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lấy category với pagination cho images
curl -X GET "http://localhost:3000/api/categories/$CATEGORY_ID?imagesPage=1&imagesLimit=5" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Tìm kiếm trong images của category
curl -X GET "http://localhost:3000/api/categories/$CATEGORY_ID?imagesSearch=sunset" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"
```

### 2.4 Cập nhật Category (Admin/Editor)
```bash
curl -X PUT http://localhost:3000/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Nature Photos",
    "description": "Updated description for nature photos",
    "status": true
  }'
```

### 2.5 Xóa Category (Admin/Editor)
```bash
curl -X DELETE http://localhost:3000/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 🖼️ 3. Images APIs

### 3.1 Upload Images (Admin/Editor)
```bash
# Tạo file ảnh test (cần có ảnh thật)
# Giả sử có file test-image.jpg trong thư mục hiện tại

curl -X POST http://localhost:3000/api/images \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "title=Test Image 1" \
  -F "description=This is a test image upload" \
  -F "categoryIds=$CATEGORY_ID" \
  -F "images=@test-image.jpg"

# Upload nhiều ảnh cùng lúc
curl -X POST http://localhost:3000/api/images \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "title=Multiple Images" \
  -F "description=Testing multiple image upload" \
  -F "categoryIds=$CATEGORY_ID" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"

# Test upload file không hợp lệ (sẽ trả 400)
curl -X POST http://localhost:3000/api/images \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "title=Invalid File" \
  -F "images=@test.txt"
```

### 3.2 Lấy danh sách Images (Public)
```bash
# Lấy tất cả images
curl -X GET http://localhost:3000/api/images \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lấy images với pagination
curl -X GET "http://localhost:3000/api/images?page=1&limit=5" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Tìm kiếm images
curl -X GET "http://localhost:3000/api/images?search=test" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lọc theo category
curl -X GET "http://localhost:3000/api/images?categoryId=$CATEGORY_ID" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Sắp xếp theo countUsage
curl -X GET "http://localhost:3000/api/images?sort=countUsage:desc" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"

# Lọc theo status
curl -X GET "http://localhost:3000/api/images?status=true" \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"
```

### 3.3 Lấy chi tiết Image (Public)
```bash
# Thay IMAGE_ID bằng ID thật từ response upload
export IMAGE_ID="68e0b11e6ab58e592ff051b2" # Thay bằng ID thật

curl -X GET http://localhost:3000/api/images/$IMAGE_ID \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production"
```

### 3.4 Cập nhật Image Metadata (Admin/Editor)
```bash
curl -X PUT http://localhost:3000/api/images/$IMAGE_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Image Title",
    "description": "Updated image description",
    "categoryIds": ["$CATEGORY_ID"]
  }'
```

### 3.5 Xóa Image (Admin/Editor)
```bash
curl -X DELETE http://localhost:3000/api/images/$IMAGE_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 📊 4. Public Increment APIs

### 4.1 Tăng Counters cho Image (Public)
```bash
# Tăng countUsage
curl -X POST http://localhost:3000/api/public/images/$IMAGE_ID/increment \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "incrementUsage": 1,
    "incrementFavorite": 0
  }'

# Tăng countFavorite
curl -X POST http://localhost:3000/api/public/images/$IMAGE_ID/increment \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "incrementUsage": 0,
    "incrementFavorite": 1
  }'

# Tăng cả hai
curl -X POST http://localhost:3000/api/public/images/$IMAGE_ID/increment \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "incrementUsage": 2,
    "incrementFavorite": 3
  }'

# Test validation (giá trị âm)
curl -X POST http://localhost:3000/api/public/images/$IMAGE_ID/increment \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "incrementUsage": -1,
    "incrementFavorite": 0
  }'

# Test validation (không có giá trị nào)
curl -X POST http://localhost:3000/api/public/images/$IMAGE_ID/increment \
  -H "Authorization: Bearer your-static-user-token-for-public-api-change-this-in-production" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🏥 5. Health Check

### 5.1 Server Status
```bash
curl -X GET http://localhost:3000/health
```

## 🔧 6. Test Script Tự động

### 6.1 Script test toàn bộ flow
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
STATIC_TOKEN="your-static-user-token-for-public-api-change-this-in-production"

echo "🚀 Starting API Tests..."

# 1. Health Check
echo "1. Testing Health Check..."
curl -s -X GET $BASE_URL/health | jq '.'

# 2. Admin Login
echo "2. Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "JWT Token: $JWT_TOKEN"

# 3. Create Category
echo "3. Testing Category Creation..."
CATEGORY_RESPONSE=$(curl -s -X POST $BASE_URL/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Category", "description": "Test category for API testing"}')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.category.id')
echo "Category ID: $CATEGORY_ID"

# 4. Get Categories
echo "4. Testing Get Categories..."
curl -s -X GET $BASE_URL/api/categories \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'

# 5. Get Category Detail
echo "5. Testing Get Category Detail..."
curl -s -X GET $BASE_URL/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'

# 6. Update Category
echo "6. Testing Update Category..."
curl -s -X PUT $BASE_URL/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Test Category"}' | jq '.'

# 7. Get Images
echo "7. Testing Get Images..."
curl -s -X GET $BASE_URL/api/images \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'

# 8. Test Increment (nếu có image)
echo "8. Testing Increment API..."
# Lấy image ID đầu tiên
IMAGE_ID=$(curl -s -X GET $BASE_URL/api/images \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq -r '.items[0].id // empty')

if [ ! -z "$IMAGE_ID" ]; then
  echo "Testing increment for Image ID: $IMAGE_ID"
  curl -s -X POST $BASE_URL/api/public/images/$IMAGE_ID/increment \
    -H "Authorization: Bearer $STATIC_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"incrementUsage": 1, "incrementFavorite": 1}' | jq '.'
else
  echo "No images found to test increment API"
fi

echo "✅ API Tests Completed!"
```

## 📝 7. Test Cases Checklist

### ✅ Authentication Tests
- [ ] Admin login với credentials hợp lệ
- [ ] Admin login với credentials sai
- [ ] JWT token verification
- [ ] Static token verification
- [ ] Access denied khi không có token

### ✅ Categories Tests
- [ ] Tạo category với admin token
- [ ] Tạo category không có token (401)
- [ ] Validation khi thiếu required fields
- [ ] Lấy danh sách categories với static token
- [ ] Pagination cho categories
- [ ] Search categories
- [ ] Lấy chi tiết category với images
- [ ] Cập nhật category
- [ ] Soft delete category

### ✅ Images Tests
- [ ] Upload image với admin token
- [ ] Upload nhiều images
- [ ] Upload file không hợp lệ (400)
- [ ] Lấy danh sách images với static token
- [ ] Pagination cho images
- [ ] Search images
- [ ] Filter images theo category
- [ ] Lấy chi tiết image
- [ ] Cập nhật image metadata
- [ ] Soft delete image

### ✅ Public Increment Tests
- [ ] Tăng countUsage
- [ ] Tăng countFavorite
- [ ] Tăng cả hai counters
- [ ] Validation cho giá trị âm
- [ ] Validation khi không có giá trị
- [ ] Rate limiting (nếu spam)

### ✅ Error Handling Tests
- [ ] 404 cho resource không tồn tại
- [ ] 400 cho validation errors
- [ ] 401 cho authentication errors
- [ ] 403 cho authorization errors
- [ ] 413 cho file quá lớn
- [ ] 429 cho rate limiting

## 🎯 Expected Results

### Successful Responses:
- **200 OK**: GET requests, successful updates
- **201 Created**: POST requests tạo mới thành công
- **401 Unauthorized**: Không có token hoặc token sai
- **400 Bad Request**: Validation errors
- **404 Not Found**: Resource không tồn tại

### Response Format:
```json
{
  "success": true,
  "data": { ... },
  "totalItems": 100,
  "totalPages": 10,
  "currentPage": 1,
  "items": [ ... ]
}
```

## 🔍 Debug Tips

1. **Kiểm tra server logs**: Server sẽ log tất cả requests và errors
2. **Kiểm tra MongoDB**: Dữ liệu được lưu trong collections `adminusers`, `categories`, `images`
3. **Kiểm tra uploads folder**: Files được lưu trong `uploads/images/`
4. **Kiểm tra logs**: Logs được ghi trong `logs/combined.log` và `logs/error.log`

## 📞 Troubleshooting

### Server không start:
```bash
# Kiểm tra port 3000 có bị chiếm không
lsof -i :3000

# Kiểm tra MongoDB có chạy không
mongosh mongodb://localhost:27017/posed-server
```

### Authentication errors:
- Kiểm tra JWT token có hết hạn không
- Kiểm tra static token trong .env file
- Kiểm tra admin user có tồn tại trong database không

### Upload errors:
- Kiểm tra file có đúng MIME type không
- Kiểm tra file size có vượt quá limit không (10MB)
- Kiểm tra uploads folder có quyền write không
