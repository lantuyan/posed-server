🚀 Sprint 1 — Backend Core Setup & Authentication

Thời gian: 2025-10-01 → 2025-10-05
Trạng thái: 🟢 Planned
Phiên bản: v1.0.0
Mục tiêu: Khởi tạo hạ tầng backend, thiết lập xác thực admin/editor (JWT) và user public (STATIC_USER_TOKEN), cấu hình môi trường, model cơ sở dữ liệu, middleware bảo mật, và error handling tập trung.

1. 🎯 Mục tiêu chính

Tạo cấu trúc thư mục backend chuẩn theo tài liệu kiến trúc.

Cấu hình môi trường .env (JWT_SECRET, STATIC_USER_TOKEN, upload path, size limit).

Thiết lập MongoDB & models: AdminUser, Category, Image.

Xây dựng AuthService, AuthController, và route /api/admin/login.

Xác thực bằng:

JWT cho admin/editor.

STATIC_USER_TOKEN cho public user (App Pose).

Middleware:

verifyAdminOrEditor

verifyStaticUser

errorHandler, rateLimiter, validateRequest

Logging cơ bản (winston/pino).

Viết unit tests cho authentication flow.

2. ⚙️ Phạm vi kỹ thuật (Technical Breakdown)
Thành phần	Mô tả	File liên quan
Cấu trúc dự án	src/config, controllers, middlewares, models, routes, services, utils	src/app.js, src/server.js
ENV	JWT_SECRET, JWT_EXPIRES_IN, STATIC_USER_TOKEN, UPLOAD_PATH, MAX_IMAGE_SIZE, INCR_MAX_PER_MINUTE	.env
Model	AdminUser, Category, Image	src/models/
Auth Service	Xử lý login, bcrypt, JWT sign	src/services/authService.js
Middleware	JWT & Static token verification, errorHandler, rateLimiter	src/middlewares/
Logging	winston hoặc pino	src/utils/logger.js
Validation	express-validator hoặc Joi	src/middlewares/validateRequest.js
3. 🧩 Cấu trúc thư mục (Dự kiến)
src/
 ├── app.js
 ├── server.js
 ├── config/
 │   └── index.js
 ├── controllers/
 │   └── authController.js
 ├── middlewares/
 │   ├── authJwt.js
 │   ├── validateRequest.js
 │   ├── errorHandler.js
 │   └── rateLimiter.js
 ├── models/
 │   ├── AdminUser.js
 │   ├── Category.js
 │   └── Image.js
 ├── routes/
 │   ├── adminRoutes.js
 │   └── index.js
 ├── services/
 │   └── authService.js
 └── utils/
     └── logger.js

4. 🔐 Luồng xác thực (Authentication Flow)
Admin / Editor:

Client gửi POST /api/admin/login → body { username, password }

Server kiểm tra user → so sánh mật khẩu bcrypt.compare

Nếu hợp lệ → sinh JWT payload { userId, role }, ký với JWT_SECRET

Response:

{ "token": "eyJhbGci...", "role": "admin" }

Public App (User):

App Pose gửi request kèm Header:

Authorization: Bearer <STATIC_USER_TOKEN>


Middleware verifyStaticUser kiểm tra khớp với ENV STATIC_USER_TOKEN.

Nếu hợp lệ → cho phép truy cập các route public (GET categories, GET images, POST /api/public/images/:id/increment).

5. 🧱 API cần triển khai trong Sprint 1
Method	Endpoint	Auth	Mô tả
POST	/api/admin/login	Public	Đăng nhập admin/editor, trả JWT
GET	/api/test-admin	JWT	(Route test) xác minh middleware verifyAdminOrEditor
GET	/api/test-public	STATIC_USER_TOKEN	(Route test) xác minh middleware verifyStaticUser
6. 🧠 Task Mapping for AI Agent
ID	Lệnh tác vụ	Mô tả chi tiết	Ưu tiên
T1	agent.create_task("setup_backend_skeleton", description="Khởi tạo project ExpressJS base, cấu trúc thư mục chuẩn, cài đặt express, mongoose, dotenv", priority="high")	Khởi tạo project Node + Express, config Mongoose, cấu trúc module hóa.	🔥
T2	agent.create_task("setup_env_and_config", description="Tạo file .env, module config/index.js với JWT_SECRET, STATIC_USER_TOKEN, upload path, size limit, rate limit", priority="high")	Thiết lập config cơ bản theo chuẩn.	🔥
T3	agent.create_task("create_models_admin_category_image", description="Tạo models AdminUser, Category, Image theo schema Mongoose", priority="high")	Code theo schema hướng dẫn.	🔥
T4	agent.create_task("implement_auth_service_and_controller", description="Tạo authService xử lý bcrypt + JWT, authController cho /api/admin/login", priority="high")	Theo logic login.	🔥
T5	agent.create_task("implement_jwt_and_static_token_middlewares", description="Middleware verifyAdminOrEditor và verifyStaticUser; kiểm JWT hoặc STATIC_USER_TOKEN", priority="high")	Middleware mẫu.	🔥
T6	agent.create_task("implement_error_and_validation_middlewares", description="errorHandler, validateRequest, rateLimiter cơ bản", priority="medium")	Validation và rate limit theo hướng dẫn.	⚙️
T7	agent.create_task("implement_logger", description="Tạo utils/logger.js dùng winston hoặc pino, log request & error", priority="medium")	Cấu hình logging.	⚙️
T8	agent.create_task("write_unit_tests_for_auth", description="Test đăng nhập admin, JWT verify, static token verify", priority="high")	Jest hoặc Mocha, độ phủ ≥80%.	🧪
7. ✅ Definition of Done (DoD)

 Cấu trúc thư mục đúng chuẩn, chạy được npm run dev (Express app start OK).

 ENV và config hợp lệ, không lỗi khi parse.

 Models được khởi tạo trong MongoDB, tạo được admin user mẫu (qua script).

 /api/admin/login hoạt động: trả JWT hợp lệ.

 verifyAdminOrEditor và verifyStaticUser hoạt động, trả lỗi 401/403 đúng.

 Middleware errorHandler hoạt động.

 Logger ghi log request + error.

 Unit tests pass ≥80%.

8. 🧩 Acceptance Criteria (AC)
#	Tiêu chí	Kết quả mong đợi
1	Đăng nhập admin	POST /api/admin/login → JWT + role
2	Xác thực admin/editor	Header Bearer <jwt> → truy cập route bảo vệ
3	Xác thực public user	Header Bearer <STATIC_USER_TOKEN> → truy cập route public
4	Middleware	Xử lý 401/403 chính xác, lỗi trả JSON chuẩn { error: "Unauthorized" }
5	Logging	Có log request, error stack trace
6	Error handling	Toàn bộ lỗi đi qua errorHandler cuối tuyến
7	Tests	Unit test pass ≥80%, bao phủ login & middleware
9. 🧪 QA Checklist
Kiểm thử	Kết quả mong đợi
🧩 Test login hợp lệ	200 OK, trả JWT có payload hợp lệ
🔒 Test login sai mật khẩu	401 Unauthorized
🧠 Test verifyAdminOrEditor với JWT hợp lệ	200 OK
🚫 Test verifyAdminOrEditor với JWT sai	401 Unauthorized
🌍 Test verifyStaticUser với token đúng	200 OK
❌ Test verifyStaticUser sai token	401 Unauthorized
🧾 Test rate limit	429 Too many requests (khi spam)
🧰 Test log output	Có log request & error
⚙️ Test errorHandler	Trả JSON { error: "..." } đúng định dạng
10. 📈 Kế hoạch bàn giao cuối sprint
Deliverable	Mô tả
✅ Backend skeleton	Code base chuẩn hóa theo kiến trúc
✅ Auth APIs	/api/admin/login, middlewares xác thực
✅ Middleware	JWT, Static token, ErrorHandler, RateLimiter
✅ Logger	Log request/error
✅ Unit Tests	≥80% độ phủ, test auth/middleware