🔵 Sprint 3 — Public Increment API & Dashboard (Auth + CRUD + Analytics)

Thời gian: 2025-10-10 → 2025-10-20
Phiên bản: v1.0.0
Trạng thái: 🔄 In Progress

1. 🎯 Mục tiêu chính

Hoàn thiện Public Increment API cho phép App Pose tăng countUsage và countFavorite an toàn, có rate-limit và logging.

Tích hợp middleware xác thực public (verifyStaticUser) và bảo vệ abuse (per IP/token).

Xây dựng Dashboard (Next.js) gồm:

Đăng nhập bằng JWT.

Module Categories (CRUD).

Module Images (Upload, Edit Metadata).

Analytics cơ bản: tổng category, ảnh, usage, favorite; biểu đồ top ảnh yêu thích.

Tích hợp backend + dashboard hoàn chỉnh (E2E).

2. ⚙️ Phạm vi kỹ thuật (Technical Breakdown)
Thành phần	Mô tả	File liên quan
Public Increment API	POST /api/public/images/:id/increment – xác thực bằng STATIC_USER_TOKEN	src/controllers/publicController.js
Rate Limiter	express-rate-limit cho increment API (config từ ENV)	src/middlewares/rateLimiter.js
Atomic Update	$inc đồng thời countUsage và countFavorite	src/services/imageService.js
Audit Logging	Log event (imageId, ip, increments, timestamp)	src/utils/logger.js
Dashboard App	Next.js + Tailwind + Ant Design	/dashboard/
Dashboard Auth	Trang Login, lưu JWT, gọi API Bearer token	/dashboard/pages/login.js
Dashboard CRUD	Gọi API categories/images qua fetch/axios	/dashboard/pages/categories/, /dashboard/pages/images/
Analytics UI	Cards & charts: tổng category, ảnh, usage, favorite; top ảnh yêu thích	/dashboard/pages/analytics/
Charts	Sử dụng recharts	/dashboard/components/ChartUsageFavorite.js
3. 📡 APIs cần triển khai trong sprint này
Public Increment API
Method	Endpoint	Auth	Mô tả
POST	/api/public/images/:id/increment	STATIC_USER_TOKEN	Tăng countUsage / countFavorite atomically

Body:

{
  "incrementUsage": 1,
  "incrementFavorite": 0
}


Response:

{
  "success": true,
  "image": {
    "id": "img123",
    "countUsage": 10,
    "countFavorite": 5
  }
}


Rules:

Auth header: Authorization: Bearer <STATIC_USER_TOKEN>

Body params >= 0

Atomic $inc

Rate-limit per IP/token (VD: 60 req/min)

Log audit: { imageId, ip, increments, timestamp }

4. 🧩 Chi tiết Dashboard
4.1 Auth (Admin / Editor)

Trang /login: form username/password.

Gọi API /api/admin/login, lưu JWT vào localStorage.

Bảo vệ routes bằng HOC withAuth:

if (!localStorage.token) redirect('/login');


Tự động thêm header Authorization: Bearer <JWT> khi gọi API.

4.2 Categories Module

Trang /categories:

Table hiển thị category list.

Modal thêm/sửa category.

Soft delete (status=false → ẩn).

Gọi API:

GET /api/categories

POST /api/categories

PUT /api/categories/:id

DELETE /api/categories/:id

4.3 Images Module

Trang /images:

Upload nhiều ảnh (drag & drop hoặc file picker).

Hiển thị metadata ảnh (title, size, category).

Edit metadata.

Soft delete.

Gọi API:

GET /api/images

POST /api/images

PUT /api/images/:id

DELETE /api/images/:id

4.4 Analytics Module

Trang /analytics:

Cards: tổng categories, tổng images, tổng usage, tổng favorite.

Chart: top 10 ảnh có countFavorite cao nhất.

Bảng chi tiết: ảnh + usage/favorite.

Gọi API backend:

GET /api/images?sort=countFavorite:desc&limit=10

GET /api/categories (đếm tổng)

Aggregate countUsage, countFavorite.

5. 🔧 Frontend cấu trúc thư mục đề xuất
dashboard/
 ├── pages/
 │   ├── login.js
 │   ├── categories/
 │   │   ├── index.js
 │   │   └── [id].js
 │   ├── images/
 │   │   ├── index.js
 │   │   └── [id].js
 │   └── analytics/
 │       └── index.js
 ├── components/
 │   ├── Layout.js
 │   ├── CategoryForm.js
 │   ├── ImageUploader.js
 │   ├── ChartUsageFavorite.js
 │   └── StatCard.js
 ├── lib/
 │   ├── api.js (fetch wrapper)
 │   └── auth.js (JWT helpers)
 └── styles/
     └── globals.css

6. 🧠 Task Mapping for AI Agent
ID	Lệnh tác vụ	Mô tả chi tiết	Ưu tiên
T1	agent.create_task("implement_public_increment_api", description="Tạo API POST /api/public/images/:id/increment với verifyStaticUser, $inc atomic, rate limit và audit log", priority="high")	Theo FR.	🔥
T2	agent.create_task("add_rate_limit_and_logging_audit", description="Thêm express-rate-limit cho increment API, log event (imageId, ip, timestamp, increments)", priority="high")	Theo patterns.	🔥
T3	agent.create_task("dashboard_setup_nextjs_app", description="Khởi tạo Next.js app + cấu hình Tailwind, Ant Design, Recharts", priority="high")	Setup frontend.	🔥
T4	agent.create_task("dashboard_auth_login_jwt", description="Xây trang /login, gọi /api/admin/login, lưu JWT, guard routes", priority="high")	Login flow dashboard.	🔥
T5	agent.create_task("dashboard_categories_module", description="Trang /categories list/create/update/delete category", priority="high")	CRUD categories.	🔥
T6	agent.create_task("dashboard_images_module", description="Trang /images upload, edit metadata, soft delete", priority="high")	CRUD images.	🔥
T7	agent.create_task("dashboard_analytics_basic", description="Trang /analytics hiển thị cards + chart top ảnh yêu thích", priority="medium")	Analytics module.	⚙️
T8	agent.create_task("e2e_integration_tests", description="Kiểm thử E2E giữa dashboard và backend", priority="high")	Đảm bảo flow login → CRUD → analytics hoạt động.	🧪
7. ✅ Definition of Done (DoD)

 API /api/public/images/:id/increment hoạt động đúng, atomic $inc.

 Rate-limit & logging audit hoạt động.

 Dashboard chạy được trên localhost:3000.

 Đăng nhập bằng JWT thành công, bảo vệ route.

 CRUD categories & images hoạt động từ dashboard.

 Upload ảnh qua dashboard (multi-file).

 Trang analytics hiển thị số liệu chính xác.

 E2E test: login → CRUD → analytics thành công.

8. 🧩 Acceptance Criteria (AC)
#	Tiêu chí	Kết quả mong đợi
1	Increment API	POST /api/public/images/:id/increment tăng counters đúng
2	Rate-limit	Khi spam vượt 60/min → 429 Too Many Requests
3	Audit log	Có log { imageId, ip, increments, timestamp }
4	Dashboard login	Nhập username/password đúng → redirect /categories
5	Dashboard categories	CRUD hoạt động, soft delete
6	Dashboard images	Upload nhiều file, hiển thị metadata
7	Dashboard analytics	Cards & chart hiển thị đúng tổng usage/favorite
8	E2E	Toàn bộ flow từ dashboard đến backend chạy mượt
9. 🧪 QA Checklist
Kiểm thử	Kết quả mong đợi
⚙️ Increment API hợp lệ	200 OK, counters tăng
🚫 Sai token	401 Unauthorized
🚫 Vượt rate-limit	429 Too Many Requests
🧾 Log audit kiểm tra	Có ghi imageId, ip
💻 Dashboard Login	200 OK, JWT lưu localStorage
🔐 Dashboard Auth Guard	Không login → redirect /login
🧩 CRUD Category từ Dashboard	Thành công, phản ánh lên API
🖼️ Upload ảnh qua Dashboard	Upload nhiều file thành công
📊 Analytics cards & chart	Hiển thị đúng dữ liệu
🧪 E2E Test	Toàn bộ workflow hoạt động, không lỗi
10. 📈 Kế hoạch bàn giao cuối sprint
Deliverable	Mô tả
✅ Public Increment API	Hoạt động, rate-limit, audit log
✅ Dashboard Auth	Login + JWT guard
✅ Dashboard CRUD	Categories + Images module
✅ Dashboard Analytics	Cards + Charts + Table
✅ Integration	Dashboard ↔ Backend kết nối hoàn chỉnh
✅ Tests	E2E test pass ≥90%
11. ⚡ Performance Targets
Thành phần	Mục tiêu	Ghi chú
Increment API	<200ms	Dù gọi liên tục vẫn ổn định
CRUD APIs	<500ms	Dưới dataset trung bình
Dashboard load	<2s	Dưới 50 categories / 500 images
Analytics load	<1s	Cache nhẹ bằng client side
12. 📘 Retrospective (sau sprint)

(Sẽ hoàn thiện sau khi bàn giao – gồm đánh giá UX Dashboard, tối ưu tốc độ, và mở rộng analytics.)

✅ Kết thúc Sprint 3.
Sau khi hoàn thành sprint này, hệ thống Pose đạt được:

Backend đầy đủ (Auth + CRUD + Upload + Increment).

Dashboard hoàn chỉnh (Auth + CRUD + Analytics).

Tích hợp E2E, sẵn sàng cho giai đoạn deploy lên VPS (Sprint 4+).