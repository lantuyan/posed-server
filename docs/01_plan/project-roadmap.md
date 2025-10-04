🧭 Project Roadmap — Pose Backend & Dashboard

Project: Pose Backend (Node.js + Express + MongoDB) & Dashboard (Next.js)
Version: 1.0.0
Maintainer: Pose AI Agent System
Ngày cập nhật: 2025-10-04 (UTC+7) - Sprint 2 Completed

0) Bối cảnh & Phạm vi

Mục tiêu cốt lõi: xây dựng backend phục vụ app Pose và dashboard quản trị: CRUD categories, upload/list/update images, public API tăng counters (usage/favorite), xác thực 2 lớp: JWT cho admin/editor, STATIC_USER_TOKEN cho public app (không đăng ký/đăng nhập).

Lưu trữ: ảnh lưu trên filesystem của VPS, không dùng S3 hay caching layer trong giai đoạn này (yêu cầu của dự án).

Dashboard: Next.js, hỗ trợ Auth + CRUD và module thống kê cơ bản (số ảnh, số category, tổng usage/favorite theo ngày/tuần/tháng).

Định tuyến & kiến trúc backend: tuân theo layout thư mục, middleware, models, services, routes, config như tài liệu kiến trúc, sử dụng libs & best practices tham khảo.

Chuẩn API & Hành vi nghiệp vụ: theo đặc tả FR/NFR/AC đã chuẩn hóa.

1) Mục tiêu dự án (Objectives)

Backend API hoàn chỉnh

Auth admin/editor bằng JWT; public dùng STATIC_USER_TOKEN cho đọc & increment counters.

CRUD categories, CRUD images, upload ảnh (multipart), pagination & search, soft delete, index tối ưu.

Public Increment API: $inc atomic, rate limiting, logging audit.

Dashboard quản trị

Đăng nhập JWT, phân quyền giao diện (admin/editor).

Module Categories (list/create/update/soft-delete).

Module Images (upload nhiều file, edit metadata, gán categories).

Analytics cơ bản: thẻ tổng quan (cards), bảng & biểu đồ: tổng ảnh, tổng category, tổng usage/favorite; lọc theo thời gian.

Bảo mật & Hiệu năng

Bcrypt cho mật khẩu admin, JWT ký với secret, helmet/cors, input validation, centralized error handling.

Pagination chuẩn { totalItems, totalPages, currentPage, items }, index MongoDB, giới hạn tải ảnh, giới hạn ảnh trả về trong category detail (threshold).

Vận hành

Chạy trên VPS với PM2/systemd, có kịch bản backup MongoDB + uploads/ (tài liệu vận hành riêng).

Logging hệ thống & increment audit (winston/pino).

2) Phạm vi tính năng (In-scope)
2.1 Backend — APIs & Behaviors

Auth (Admin)

POST /api/admin/login nhận username/password, trả JWT chứa role (admin/editor).

Middleware: verifyAdminOrEditor kiểm JWT & role; verifyStaticUser kiểm STATIC_USER_TOKEN cho public.

Categories

POST /api/categories (admin/editor), GET /api/categories (public), GET /api/categories/:id trả kèm mảng images với tuỳ chọn phân trang; PUT, DELETE (soft delete).

Nếu ảnh quá nhiều vượt ngưỡng, bắt buộc client dùng phân trang / trả về lỗi hướng dẫn phân trang.

Images

POST /api/images upload một/nhiều ảnh (multer), lưu filesystem + metadata (width/height/size/mime), validate categoryIds[] tồn tại.

GET /api/images có lọc, search, sort, pagination; GET /api/images/:id (tùy config có thể auto $inc usage).

PUT /api/images/:id update metadata; DELETE soft delete.

Public Increment

POST /api/public/images/:id/increment (Header Authorization: Bearer <STATIC_USER_TOKEN>): body { incrementUsage>=0, incrementFavorite>=0 }; $inc atomic; rate limit & logging.

Kiến trúc thư mục, config, models, middleware, services, routing theo hướng dẫn chuẩn. Thư viện đề xuất, patterns & snippets (JWT, multer, $inc, rate limiting, validation) tham khảo.

2.2 Dashboard — Modules

Auth UI: trang Login, lưu JWT (storage an toàn), guard routes.

Categories UI: table (paging/sort/search), form create/update, soft delete.

Images UI: upload (multi), preview, edit metadata, gán categories, list/pagination/search.

Analytics cơ bản:

Cards: Tổng categories, tổng images, tổng usage, tổng favorite (cộng dồn).

Bảng & biểu đồ: Top-N images by favorite/usage; thống kê usage/favorite theo ngày tuần/tháng (server trả số liệu tổng hợp đơn giản – có thể tính từ counters và createdAt).

Bộ lọc thời gian: preset (7d/30d/90d) + custom range.

Lưu ý: Phase này không xây event pipeline phức tạp; dùng counters & createdAt cho aggregate nhẹ.

3) Kiến trúc kỹ thuật (Technical Architecture)

Stack Backend: Node.js + Express + MongoDB (Mongoose); cấu trúc module hoá controllers/services/middlewares/routes; config .env (JWT secret, static token, upload path, size limits, rate limits).

Bảo mật: helmet, cors, bcrypt, JWT, rate limiting increment & (tuỳ chọn) login; centralized error handler; input validation (Joi/express-validator).

Upload & Filesystem: multer disk storage (tạo tên file UUID + ext; whitelist mime; limit size), đọc metadata với sharp/probe-image-size.

Logging: winston/pino; log request, error, và audit increment (imageId, ip, timestamp, increments).

Models & Indexes: AdminUser, Category, Image với các field & index chủ đạo (categoryIds, createdAt, status).

Performance: pagination chuẩn, limit tối đa, thresholds tránh payload khổng lồ, $inc atomic, index tối ưu, tránh N+1, xử lý upload song song hợp lý.

4) Lộ trình theo Giai đoạn (Milestones)
Milestone	Thời gian (dự kiến)	Deliverables
M1 – Phân tích & Thiết kế	2025-09-25 → 2025-09-30	Hoàn tất docs nền: requirements, implementation-guide, reference
M2 – Backend Core	2025-10-01 → 2025-10-10	Auth, CRUD categories/images, upload, public routes cơ bản
M3 – Dashboard	2025-10-10 → 2025-10-20	UI Auth + CRUD + Analytics cơ bản
M4 – Tích hợp & Kiểm thử	2025-10-20 → 2025-10-25	Kết nối E2E, test, tinh chỉnh hiệu năng
M5 – Vận hành	2025-10-25 → 2025-10-30	Deploy VPS, backup, tài liệu vận hành

Từng milestone sẽ được chi tiết trong các sprint-1.md, sprint-2.md, sprint-3.md (đợt 1 gồm 3 sprint).

5) Kế hoạch Sprint (Wave 1: 3 Sprint)
Sprint 1 — Backend Core Setup & Auth ✅ COMPLETED

Thời gian: 2025-10-01 → 2025-10-04 (Hoàn thành sớm)

Mục tiêu: khung dự án, config, models, auth flow (JWT admin/editor), static token cho public, middlewares & error handling, rate limiter nền tảng.

Kết quả: ✅ đăng nhập admin/editor, verify role; verify static token; unit tests chính cho auth & middlewares. Tất cả tests pass (8/8), server hoạt động ổn định.

Sprint 2 — Categories & Images ✅ COMPLETED

Thời gian: 2025-10-05 → 2025-10-04 (Hoàn thành sớm)

Mục tiêu: CRUD categories & images, upload ảnh (multer), metadata, pagination/search, index DB, logging.

Kết quả: ✅ API ổn định, response pagination chuẩn, upload nhiều file hoạt động, validate categories, soft delete. Tất cả tests pass (31/31), public increment API hoạt động.

Sprint 3 — Public Increment & Dashboard (Auth + CRUD + Analytics cơ bản)

Thời gian: 2025-10-10 → 2025-10-20

Mục tiêu: Public Increment $inc + rate-limit + audit; triển khai dashboard (Login, Categories, Images, Analytics cơ bản).

Kết quả: E2E từ dashboard gọi backend; trang tổng quan có thẻ & biểu đồ cơ bản.

Chi tiết task, acceptance, checklist nằm trong từng file sprint tương ứng.

6) Quản trị cấu hình (Configuration Matrix)
Biến ENV	Mục đích	Gợi ý mặc định / Lưu ý
JWT_SECRET	Ký/verify JWT	Bắt buộc cấu hình
JWT_EXPIRES_IN	Hạn token admin	Mặc định 1h
STATIC_USER_TOKEN	Token cho public API	Bắt buộc; log mọi hoạt động public
UPLOAD_PATH	Thư mục lưu ảnh	VD: /data/uploads/images
MAX_IMAGE_SIZE	Giới hạn dung lượng ảnh	Mặc định 10MB/ảnh
IMAGES_ARRAY_MAX_DEFAULT	Ngưỡng trả full array images trong category detail	Ép dùng pagination nếu vượt ngưỡng
INCR_MAX_PER_MINUTE	Rate limit increment per-IP/token	Mặc định 60/phút

Full block config xem config/index.js gợi ý trong tài liệu kiến trúc; libs, rate-limiting, validation xem thêm.

7) Rủi ro & Giảm thiểu (Risks & Mitigations)
Rủi ro	Ảnh hưởng	Giảm thiểu
Lộ STATIC_USER_TOKEN	Spam increment, dữ liệu sai lệch	Rate limiting + logging audit + alert bất thường
Payload khổng lồ khi get category detail	Timeout, OOM	Áp ngưỡng IMAGES_ARRAY_MAX_DEFAULT & bắt buộc pagination
Upload ảnh độc hại	RCE, tấn công	MIME whitelist + size limit + sanitize filename + cố định UPLOAD_PATH
Hiệu năng query lớn	API chậm	Index phù hợp categoryIds, createdAt, status; pagination chuẩn
Sai sót phân quyền	Data leak	Middleware tách bạch: verifyAdminOrEditor vs verifyStaticUser
8) Acceptance Criteria (Dự án tổng)

✅ Đạt 100% FR: tất cả endpoints, hành vi & phản hồi theo requirements.md.

✅ Auth hoạt động: JWT cho admin/editor; public yêu cầu STATIC_USER_TOKEN cho GET & increment.

✅ Upload ảnh → metadata (width/height/size/mime), lưu filesystem + MongoDB.

✅ Pagination chuẩn ở list images/categories; category detail hỗ trợ trả ảnh full khi không vượt threshold hoặc cung cấp pagination.

✅ Increment API atomic $inc, rate-limited, có logs audit.

✅ Dashboard: Login + CRUD + Analytics cơ bản.

✅ Error handling & validation tập trung; logging hệ thống & audit increment.

✅ Hiệu năng mục tiêu: endpoint phổ biến < 500ms với dataset nhỏ; increment < 200ms.

9) Thước đo thành công (KPIs)

Độ phủ test ≥ 80% module core (auth, middleware, increment, CRUD).

Tỉ lệ lỗi 5xx < 1% trong giai đoạn UAT.

Thời gian phản hồi trung bình cho GET phổ biến < 500ms; increment < 200ms.

Tính sẵn sàng > 99% trong 2 tuần pilot.

10) Quản trị dự án & Giao tiếp

Theo dõi tiến độ: cập nhật trạng thái theo Sprint trong docs/02_implement/.

Nhật ký quyết định (Decision log): ghi nhận tại cuối mỗi sprint (mục “Retrospective & Changes”).

Chuẩn review: code review 2 chiều; checklist bảo mật & hiệu năng trước khi merge.

11) Chuẩn kỹ thuật & Best Practices (Tóm tắt)

Patterns: Repository/Service, centralized error handler, input validation, rate limiting, logging audit.

Snippets chủ đạo: JWT sign/verify; $inc atomic updates; multer disk storage & fileFilter; middlewares verifyAdminOrEditor, verifyStaticUser.

Routing chuẩn: /api/admin, /api/categories, /api/images, /api/public wiring tại app.js.

Models: AdminUser, Category, Image kèm indexes như hướng dẫn.

12) Lộ trình bàn giao (Handover Plan)

Tài liệu hệ thống:

requirements.md (FR/NFR/AC)

implementation-guide.md (kiến trúc, models, routes, config)

reference.md (thư viện, patterns, snippets)

Mã nguồn:

Backend /src theo layout chuẩn

Dashboard /dashboard

Hướng dẫn vận hành:

Cấu hình ENV

Chạy PM2/systemd

Backup MongoDB + uploads/

Checklist QA & Bảo mật: hoàn tất trước khi go-live.

13) Task Mapping for AI Agent (toàn dự án)

Các task primitives dưới đây là “khung lệnh” chuẩn để dùng trong các sprint files. Mỗi Sprint sẽ có bảng task chi tiết (ID, mô tả, input/outputs, acceptance).

agent.create_task("setup_backend_skeleton", priority="high", tags=["backend","init"])
agent.create_task("implement_auth_jwt_admin", priority="high", tags=["backend","auth"])
agent.create_task("implement_static_token_public", priority="high", tags=["backend","auth"])
agent.create_task("implement_categories_crud", priority="high", tags=["backend","categories"])
agent.create_task("implement_images_upload_and_crud", priority="high", tags=["backend","images","upload"])
agent.create_task("implement_images_list_with_pagination", priority="medium", tags=["backend","images","pagination"])
agent.create_task("implement_category_detail_with_images_and_threshold", priority="medium", tags=["backend","categories","images"])
agent.create_task("implement_public_increment_api", priority="high", tags=["backend","public","counters"])
agent.create_task("add_rate_limit_and_logging_audit", priority="high", tags=["backend","security"])
agent.create_task("add_input_validation_and_error_handler", priority="high", tags=["backend","quality"])
agent.create_task("optimize_mongodb_indexes", priority="medium", tags=["backend","performance"])
agent.create_task("dashboard_setup_nextjs_app", priority="high", tags=["dashboard","init"])
agent.create_task("dashboard_auth_login_jwt", priority="high", tags=["dashboard","auth"])
agent.create_task("dashboard_categories_module", priority="high", tags=["dashboard","categories"])
agent.create_task("dashboard_images_module", priority="high", tags=["dashboard","images","upload"])
agent.create_task("dashboard_analytics_basic", priority="medium", tags=["dashboard","analytics"])
agent.create_task("e2e_integration_tests", priority="high", tags=["testing","integration"])
agent.create_task("deployment_vps_pm2_setup", priority="medium", tags=["ops","deployment"])
agent.create_task("backup_strategy_setup", priority="medium", tags=["ops","backup"])


Trong từng sprint, các lệnh trên sẽ được tham biến hoá đầy đủ (description, inputs, outputs, definition_of_done) để Agent thực thi tuần tự, có kiểm soát.

14) Phụ lục liên kết (Cross-References)

Functional & API Spec: xem requirements.md để nắm đích xác endpoints và mẫu response.

Kiến trúc & Triển khai: xem implementation-guide.md (layout code, models, middleware, routes, config).

Libs & Best Practices: reference.md (JWT, multer, $inc, rate limiting, validation, logging).