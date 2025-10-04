1. Mục tiêu

Xây dựng backend (Node.js + Express) cung cấp CRUD categories, upload ảnh, list ảnh theo category (phân trang), lưu file ảnh trên local filesystem; xác thực admin bằng JWT (role: admin, editor); người dùng đọc sử dụng token tĩnh (ENV STATIC_USER_TOKEN).

2. Functional Requirements (FR) — Cập nhật
2.1 Auth

POST /api/admin/login — admin login (username + password) → trả về JWT (payload chứa role).

Middleware kiểm tra JWT cho tất cả endpoint admin (CRUD categories, upload images, cập nhật metadata, …).

STATIC_USER_TOKEN (ENV) — token tĩnh dùng cho các API đọc/public (GET categories, GET images, và endpoint increment counters). Nếu thiếu/không đúng → 401.

2.2 Categories

POST /api/categories — tạo category. Quyền: admin hoặc editor.

GET /api/categories — list categories (public). Hỗ trợ page, limit (tùy chọn). Trả metadata categories.

GET /api/categories/:id — lấy chi tiết category + kèm theo mảng ảnh (metadata) thuộc category đó.

Behavior chi tiết:

Mặc định trả toàn bộ mảng ảnh (fields metadata) sắp xếp createdAt DESC.

HỖ TRỢ query params để phân trang mảng ảnh hợp lý (tránh payload quá lớn):

imagesPage (default = 1)

imagesLimit (default = no-limit hoặc cấu hình server, ví dụ default 100)

Nếu client cung cấp imagesPage/imagesLimit → trả images là page tương ứng và kèm imagesPagination (totalItems, totalPages, currentPage).

Có thể hỗ trợ imagesSearch để tìm theo title/description.

PUT /api/categories/:id — cập nhật (admin/editor).

DELETE /api/categories/:id — set status=false (soft-delete).

Lưu ý: mặc định yêu cầu là trả full array khi GET category theo id; nhưng để tránh payload khổng lồ, endpoint hỗ trợ phân trang imagesPage/imagesLimit. (Config mặc định có imagesLimit tối đa để bảo vệ performance; có thể cấu hình bằng ENV.)

2.3 Images

POST /api/images — upload 1 hoặc nhiều ảnh. Kèm metadata: title, description, categoryIds[]. Quyền: admin/editor.

Hỗ trợ multi-part form, kiểm tra MIME và size limit (mặc định 10 MB/ảnh).

Lưu file lên local filesystem, generate filename/paths; lưu doc vào MongoDB gồm: title, description, filePath, fileName, mimeType, size, width, height, categoryIds, status (boolean), countUsage, countFavorite, createdAt, updatedAt, uploaderId (user/admin id nếu cần).

GET /api/images — list ảnh (public). Query params: categoryId, page, limit, search, status (true/false), sort (default createdAt:desc). Trả paginated result: { totalItems, totalPages, currentPage, items[] }.

GET /api/images/:id — chi tiết image. Khi client gọi endpoint chi tiết thì backend có thể tăng countUsage (tùy config; mặc định bật).

PUT /api/images/:id — update metadata (admin/editor).

DELETE /api/images/:id — set status=false (soft-delete).

2.4 API tăng counters (mới)

Mục tiêu: user (không cần login) có thể tăng countFavorite và countUsage cho một ảnh — chỉ cần cung cấp STATIC_USER_TOKEN.

Endpoint: POST /api/public/images/:id/increment

Auth: Header Authorization: Bearer <STATIC_USER_TOKEN> (kiểm tra token tĩnh).

Body (JSON):

{
  "incrementUsage": 1,
  "incrementFavorite": 0
}


incrementUsage: integer >= 0 (mặc định 0)

incrementFavorite: integer >= 0 (mặc định 0)

Behavior:

Atomically tăng countUsage và countFavorite tương ứng trong DB.

Trả về trạng thái mới: { id, countUsage, countFavorite }.

Không cần xác thực user/nguồn — chỉ xác thực token tĩnh.

Alternatives: hỗ trợ query params (ví dụ ?usage=1&favorite=0) nhưng ưu tiên body JSON cho mở rộng.

Rate-limit / Abuse prevention: nên apply rate-limiting per-IP hoặc per-token (configurable) để tránh spam tăng counts; (NFR khuyến nghị).

Ví dụ response:

{
  "success": true,
  "image": {
    "id": "64a1b2c3d4e5f6...",
    "countUsage": 123,
    "countFavorite": 45
  }
}

2.5 Auth cho users đọc

Tất cả endpoint public (GET categories, GET images, và POST /api/public/images/:id/increment) yêu cầu header Authorization: Bearer <STATIC_USER_TOKEN>. Nếu thiếu/sai → 401.

3. Non-Functional Requirements (NFR) — cập nhật liên quan

Performance:

List /get category (kèm images) phải trả kết quả nhanh — với dataset nhỏ mục tiêu < 500ms.

Vì GET /api/categories/:id mặc định trả full array ảnh, cần cấu hình tối đa imagesLimitMax (ví dụ 1000) để tránh OOM / timeouts. Khuyến nghị: trả full array chỉ khi tổng ảnh nhỏ (< config threshold) — nếu vượt threshold, trả lỗi hoặc bắt buộc phân trang.

File size limit: default 10 MB/ảnh (configurable).

Allowed MIME: image/jpeg, image/png, image/webp, image/gif.

Concurrency: hỗ trợ upload nhiều file cùng lúc.

Logging: request + error logging (level: info/error). Log các hành động increments từ public API cho audit.

Security:

Mật khẩu admin hashed bằng bcrypt.

JWT ký bằng secret (ENV JWT_SECRET), expire configurable.

STATIC_USER_TOKEN là token đơn giản không hết hạn (như yêu cầu) — lưu ý: token không hết hạn là rủi ro; log mọi hoạt động public.

API increment counters cần có rate limit/abuse protection (NFR khuyến nghị).

Storage: local filesystem path configurable UPLOAD_PATH (vd: /data/uploads/images/).

Backup: filesystem + DB backup plan (không nằm trong code mẫu nhưng phải có SOP).

Validation: validate categoryIds[] tồn tại trước khi lưu image.

4. Acceptance Criteria — cập nhật

Admin login trả JWT chứa role. JWT dùng để tạo/sửa/xóa category & image metadata.

User có STATIC_USER_TOKEN có thể gọi:

GET /api/images?categoryId=... → nhận danh sách paginated.

GET /api/categories/:id → nhận chi tiết category kèm mảng ảnh metadata (hoặc phân trang images).

POST /api/public/images/:id/increment với token hợp lệ → countUsage / countFavorite tăng và persist vào DB.

Upload ảnh lưu file vào filesystem và lưu doc Image vào MongoDB với các trường: width, height, size, mimeType, filePath, categoryIds, countUsage, countFavorite, createdAt, updatedAt.

Image list trả totalPages, totalItems, currentPage, items[].

GET /api/categories/:id trả images kèm imagesPagination nếu client dùng params phân trang.

5. API Spec (tóm tắt) — ví dụ request / response
5.1 Admin login

POST /api/admin/login

Body:

{ "username": "admin", "password": "pass" }


Response:

{ "token": "eyJhbGci...", "role": "admin" }

5.2 Create category

POST /api/categories (JWT admin/editor)

Body:

{ "title": "Nature", "description": "Ảnh thiên nhiên", "status": true }

5.3 Get category detail + images (updated)

GET /api/categories/:id

Optional query:

imagesPage, imagesLimit, imagesSearch

Response (no pagination for images):

{
  "id": "cat123",
  "title": "Nature",
  "description": "...",
  "status": true,
  "images": [
    {
      "id": "img1",
      "title": "Sunset",
      "description": "...",
      "fileName": "abc.jpg",
      "filePath": "/data/uploads/images/abc.jpg",
      "mimeType": "image/jpeg",
      "size": 123456,
      "width": 1920,
      "height": 1080,
      "countUsage": 12,
      "countFavorite": 3,
      "status": true,
      "createdAt": "2025-09-01T10:00:00Z"
    },
    ...
  ]
}


Response (with images pagination):

{
  "id":"cat123",
  "title":"Nature",
  "images": [ ... ],
  "imagesPagination": {
    "totalItems": 120,
    "totalPages": 12,
    "currentPage": 1,
    "limit": 10
  }
}

5.4 Increment counters (new)

POST /api/public/images/:id/increment

Header:

Authorization: Bearer <STATIC_USER_TOKEN>
Content-Type: application/json


Body:

{ "incrementUsage": 1, "incrementFavorite": 0 }


Response:

{
  "success": true,
  "image": {
    "id": "img1",
    "countUsage": 13,
    "countFavorite": 3
  }
}

6. Implementation notes / recommendations

DB indexing: index categoryIds, createdAt, status trên collection images để truy vấn nhanh.

Atomic increments: sử dụng $inc trong MongoDB để tránh race condition khi tăng counters.

Rate limiting: cho POST /api/public/images/:id/increment nên áp dụng express-rate-limit (ví dụ 10 requests/second per IP hoặc per token) để giảm nguy cơ spam/cheating.

Payload protection: mặc định không trả full images array nếu số ảnh > IMAGES_ARRAY_MAX (config), hoặc buộc phân trang; log event nếu client yêu cầu full array vượt ngưỡng.

Monitoring: log mỗi call to increment API (timestamp, imageId, ip) để audit.

MIME & size validation: reject files không hợp lệ với HTTP 400.