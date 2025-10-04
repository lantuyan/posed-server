Sprint 2 — Category & Image Management (CRUD + Upload + Metadata)

Thời gian: 2025-10-05 → 2025-10-04 (Hoàn thành sớm)
Phiên bản: v1.0.0
Trạng thái: ✅ Completed

1. 🎯 Mục tiêu chính

Hoàn thiện CRUD cho Categories và CRUD + Upload cho Images.

Áp dụng multer để upload ảnh vào filesystem VPS (local).

Lưu metadata ảnh (width, height, size, mimeType, filename, filepath) vào MongoDB.

Hỗ trợ phân trang (pagination), search, soft delete cho cả categories và images.

Đảm bảo performance & validation: limit dung lượng ảnh, MIME whitelist, validation categoryId tồn tại, index DB.

Logging, error handling, và unit test cơ bản cho các API chính.

2. ⚙️ Phạm vi kỹ thuật (Technical Breakdown)
Thành phần	Mô tả	File liên quan
Category CRUD	API cho admin/editor (POST/PUT/DELETE), public (GET)	src/controllers/categoryController.js
Image CRUD + Upload	Upload nhiều ảnh, lưu local, đọc metadata	src/controllers/imageController.js
Multer setup	Config upload path, filename, fileFilter	src/middlewares/upload.js
Metadata	Đọc kích thước ảnh bằng sharp hoặc probe-image-size	src/services/imageService.js
Validation	Validate body, categoryIds, file MIME & size	src/middlewares/validateRequest.js
Pagination pattern	Chuẩn { totalItems, totalPages, currentPage, items }	All GET APIs
Soft delete	Dùng status=false thay vì xóa thực	Controllers
Index DB	Index status, categoryIds, createdAt	Models
Logging	Log upload & CRUD actions	src/utils/logger.js
3. 📡 APIs cần triển khai
Categories
Method	Endpoint	Auth	Mô tả
POST	/api/categories	JWT (admin/editor)	Tạo category mới
GET	/api/categories	STATIC_USER_TOKEN	Lấy danh sách categories (public)
GET	/api/categories/:id	STATIC_USER_TOKEN	Lấy chi tiết + mảng images (phân trang nếu cần)
PUT	/api/categories/:id	JWT (admin/editor)	Cập nhật category
DELETE	/api/categories/:id	JWT (admin/editor)	Soft delete (status=false)
Images
Method	Endpoint	Auth	Mô tả
POST	/api/images	JWT (admin/editor)	Upload ảnh (một hoặc nhiều), lưu local + metadata
GET	/api/images	STATIC_USER_TOKEN	Lấy danh sách images (phân trang, search, filter)
GET	/api/images/:id	STATIC_USER_TOKEN	Lấy chi tiết ảnh (tùy config tự tăng countUsage)
PUT	/api/images/:id	JWT (admin/editor)	Cập nhật metadata ảnh
DELETE	/api/images/:id	JWT (admin/editor)	Soft delete ảnh
4. 🧱 Chi tiết logic chính
4.1 Upload ảnh

Sử dụng multer.diskStorage: đặt tên file theo UUID + ext.

Giới hạn size: config.maxImageSizeBytes (mặc định 10MB).

Kiểm MIME: chỉ image/jpeg, image/png, image/webp, image/gif.

Lưu file vào UPLOAD_PATH (VD: /data/uploads/images/).

Đọc metadata bằng sharp hoặc probe-image-size: width, height, mime, size.

Lưu doc Image:

{
  title,
  description,
  filePath,
  fileName,
  mimeType,
  size,
  width,
  height,
  categoryIds,
  status: true,
  countUsage: 0,
  countFavorite: 0
}

4.2 Pagination & Search

Chuẩn response:

{
  "totalItems": 120,
  "totalPages": 12,
  "currentPage": 1,
  "items": [...]
}


Tham số:

page (default 1)

limit (default 20)

search (regex title/description)

categoryId (lọc ảnh theo category)

Giới hạn limit <= config.defaultImagesLimit (VD: 100).

4.3 Category detail (GET /api/categories/:id)

Lấy category, kiểm tra status=true.

Query ảnh có categoryIds chứa id đó.

Nếu ảnh ≤ threshold (config.imagesArrayMaxDefault) → trả toàn bộ.

Nếu ảnh > threshold → trả lỗi 400 hoặc ép phân trang.

Cho phép query imagesPage, imagesLimit, imagesSearch.

5. 🧠 Task Mapping for AI Agent
ID	Lệnh tác vụ	Mô tả	Ưu tiên
T1	agent.create_task("implement_categories_crud", description="Tạo CategoryController với CRUD API và validate input", priority="high")	Theo FR, áp dụng status soft delete.	🔥
T2	agent.create_task("implement_images_upload_and_crud", description="Tạo ImageController xử lý upload bằng multer, lưu metadata, CRUD API", priority="high")	Upload + lưu metadata.	🔥
T3	agent.create_task("setup_multer_middleware", description="Cấu hình multer với storage, fileFilter, size limit", priority="high")	Theo mẫu.	🔥
T4	agent.create_task("validate_upload_input_and_categoryIds", description="Kiểm tra mime, size, category tồn tại trước khi lưu", priority="high")	Tránh lưu ảnh sai category.	🔥
T5	agent.create_task("implement_pagination_and_search", description="Thêm phân trang & tìm kiếm cho list images và categories", priority="medium")	Chuẩn { totalItems, totalPages, currentPage, items }.	⚙️
T6	agent.create_task("implement_category_detail_with_images_and_threshold", description="API GET /api/categories/:id kèm images, có ngưỡng threshold và phân trang tùy chọn", priority="high")	Logic threshold.	🔥
T7	agent.create_task("optimize_mongodb_indexes", description="Thêm indexes categoryIds, status, createdAt cho collections", priority="medium")	Cải thiện query performance.	⚙️
T8	agent.create_task("add_logging_to_crud_and_upload", description="Log CRUD actions và upload results", priority="medium")	Sử dụng winston/pino.	⚙️
T9	agent.create_task("unit_tests_for_crud_and_upload", description="Viết test cho category CRUD và upload ảnh", priority="medium")	Jest/Mocha, test upload valid/invalid file.	🧪
6. ✅ Definition of Done (DoD)

 CRUD Categories hoạt động đầy đủ.

 CRUD + Upload Images hoạt động, lưu metadata chính xác.

 Pagination hoạt động, kết quả chuẩn hóa.

 Category detail trả mảng ảnh hoặc yêu cầu pagination nếu vượt threshold.

 Soft delete hoạt động (status=false).

 Logging upload, CRUD, errors.

 Validation MIME, size, categoryIds chính xác.

 Unit tests pass ≥80%.

7. 🧩 Acceptance Criteria (AC)
#	Tiêu chí	Kết quả mong đợi
1	Tạo category hợp lệ	201 Created, JSON object category
2	GET /api/categories	200 OK, list categories với pagination
3	GET /api/categories/:id	200 OK, trả category + images (full hoặc phân trang)
4	Upload ảnh hợp lệ	201 Created, lưu file, metadata chính xác
5	Upload ảnh sai MIME	400 Bad Request
6	Upload ảnh vượt size limit	413 Payload Too Large
7	CRUD image hoạt động	200 OK, cập nhật metadata & soft delete đúng
8	Pagination	Trả { totalItems, totalPages, currentPage, items[] }
9	Index hoạt động	Query tốc độ nhanh (kiểm tra explain)
10	Logging	Có log hành động CRUD & upload
8. 🧪 QA Checklist
Kiểm thử	Kết quả mong đợi
🧩 POST /api/categories	Tạo category thành công
🧩 PUT /api/categories/:id	Cập nhật title/description
❌ DELETE /api/categories/:id	status=false, không xoá cứng
🌍 GET /api/categories	Trả danh sách categories đúng định dạng
🖼️ POST /api/images (upload)	Upload file hợp lệ, trả metadata
❌ POST /api/images (file invalid)	400 Bad Request
🧾 GET /api/images	Trả danh sách images với pagination
🔍 GET /api/images?search=sunset	Lọc chính xác
🧩 GET /api/categories/:id (threshold)	Trả phân trang nếu vượt ngưỡng
🧰 Logging kiểm tra	Có log upload, CRUD
⚙️ Soft delete test	Image/Category không hiển thị khi status=false
9. 📈 Kế hoạch bàn giao cuối sprint
Deliverable	Mô tả
✅ Categories CRUD API	Hoàn chỉnh, soft delete
✅ Images CRUD & Upload	Upload local + metadata
✅ Pagination & Search	Hoạt động cả cho categories & images
✅ Threshold Logic	GET category detail chuẩn hóa
✅ Logging	CRUD + upload logs
✅ Tests	≥80% coverage

10. ✅ Sprint 2 Completion Summary (2025-10-04)

**Tất cả mục tiêu đã hoàn thành:**

✅ **Categories CRUD**: Hoàn chỉnh API cho categories với POST/PUT/DELETE/GET, soft delete, pagination và search.

✅ **Images Upload & CRUD**: Multer middleware, upload nhiều file, metadata processing với Sharp, CRUD APIs hoàn chỉnh.

✅ **Validation & Security**: MIME type validation, file size limits, categoryIds validation, input validation với express-validator.

✅ **Pagination & Search**: Chuẩn hóa response format { totalItems, totalPages, currentPage, items }, search theo title/description.

✅ **Category Detail với Images**: Logic threshold để tránh payload quá lớn, hỗ trợ imagesPage/imagesLimit cho pagination.

✅ **Public Increment API**: POST /api/public/images/:id/increment với atomic $inc, rate limiting, audit logging.

✅ **MongoDB Indexes**: Indexes tối ưu cho categoryIds, status, createdAt để cải thiện query performance.

✅ **Logging**: Winston logging cho tất cả CRUD actions, upload results, và audit trails.

✅ **Unit Tests**: 31/31 tests pass với comprehensive coverage cho categories, images, và public APIs.

**Kết quả kiểm thử:**
- ✅ **31/31 tests passing** với coverage ≥80%
- ✅ **Categories CRUD** hoạt động hoàn hảo với authentication
- ✅ **Images upload** với multer, metadata processing, validation
- ✅ **Pagination & Search** cho cả categories và images
- ✅ **Public Increment API** với atomic updates và rate limiting
- ✅ **Soft delete** hoạt động đúng cho cả categories và images
- ✅ **Error handling** và validation comprehensive

**Sẵn sàng cho Sprint 3**: Categories & Images CRUD đã hoàn chỉnh, có thể bắt đầu implement Dashboard và Analytics.