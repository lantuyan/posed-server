#!/bin/bash

# 🧪 Quick Test Script cho Pose Backend APIs
# Sử dụng: ./quick-test.sh

BASE_URL="http://localhost:3000"
STATIC_TOKEN="your-static-user-token-for-public-api-change-this-in-production"

echo "🚀 Starting Quick API Tests..."
echo "=================================="

# 1. Health Check
echo "1. 🏥 Health Check..."
curl -s -X GET $BASE_URL/health | jq '.'
echo ""

# 2. Admin Login
echo "2. 🔐 Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Login successful, JWT Token: ${JWT_TOKEN:0:50}..."
echo ""

# 3. Create Category
echo "3. 📁 Creating Category..."
CATEGORY_RESPONSE=$(curl -s -X POST $BASE_URL/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Category", "description": "Test category for API testing"}')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.category.id')
echo "✅ Category created with ID: $CATEGORY_ID"
echo ""

# 4. Get Categories (Public)
echo "4. 📋 Getting Categories (Public API)..."
curl -s -X GET $BASE_URL/api/categories \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'
echo ""

# 5. Get Category Detail
echo "5. 🔍 Getting Category Detail..."
curl -s -X GET $BASE_URL/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'
echo ""

# 6. Update Category
echo "6. ✏️ Updating Category..."
curl -s -X PUT $BASE_URL/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Test Category", "description": "Updated description"}' | jq '.'
echo ""

# 7. Get Images (Public)
echo "7. 🖼️ Getting Images (Public API)..."
curl -s -X GET $BASE_URL/api/images \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.'
echo ""

# 8. Test Authentication Middlewares
echo "8. 🛡️ Testing Authentication..."
echo "   - Admin auth (should work):"
curl -s -X GET $BASE_URL/api/admin/test-admin \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.success'
echo "   - Static auth (should work):"
curl -s -X GET $BASE_URL/api/admin/test-public \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.success'
echo "   - No auth (should fail):"
curl -s -X GET $BASE_URL/api/admin/test-admin | jq '.error'
echo ""

# 9. Test Error Handling
echo "9. ❌ Testing Error Handling..."
echo "   - Invalid category ID:"
curl -s -X GET $BASE_URL/api/categories/invalid-id \
  -H "Authorization: Bearer $STATIC_TOKEN" | jq '.error'
echo "   - Missing required fields:"
curl -s -X POST $BASE_URL/api/categories \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.error'
echo ""

# 10. Clean up - Delete Category
echo "10. 🗑️ Cleaning up - Deleting test category..."
curl -s -X DELETE $BASE_URL/api/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
echo ""

echo "✅ Quick API Tests Completed!"
echo "=================================="
echo "📖 For more detailed tests, see: TEST_CURL_COMMANDS.md"
echo "🔧 Server logs: tail -f logs/combined.log"
echo "📊 MongoDB: mongosh mongodb://localhost:27017/posed-server"
