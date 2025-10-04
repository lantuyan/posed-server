1. Kiến trúc tổng quan & thư mục
src/
  config/
    index.js
  controllers/
    authController.js
    categoryController.js
    imageController.js
    publicController.js
  middlewares/
    authJwt.js
    validateRequest.js
    rateLimiter.js
    errorHandler.js
  models/
    Category.js
    Image.js
    AdminUser.js
  services/
    imageService.js
    categoryService.js
    authService.js
  utils/
    fileHelper.js
    logger.js
  routes/
    adminRoutes.js
    publicRoutes.js
    categoryRoutes.js
    imageRoutes.js
  app.js
  server.js


config/index.js: chứa các cấu hình như JWT_SECRET, STATIC_USER_TOKEN, upload path, size limit, pagination max limits, rate limit settings, etc.

controllers/: định nghĩa các handler cho từng route.

middlewares/: chứa middleware xác thực, validate input, error handling, rate limit cho API public increment.

models/: định nghĩa schema Mongoose.

services/: logic xử lý, tách biệt controller & DB logic hoặc file hệ thống.

utils/: các tiện ích chung như đọc ghi file, resize ảnh nếu cần, logger (winston/morgan).

routes/: nhóm route theo chức năng (admin, public…) và gắn middlewares thích hợp.

2. Cấu hình & môi trường (config)

Một số cấu hình cần:

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  staticUserToken: process.env.STATIC_USER_TOKEN,
  uploadPath: process.env.UPLOAD_PATH || 'uploads/images',
  maxImageSizeBytes: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'), // 10 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  imagesArrayMaxDefault: parseInt(process.env.IMAGES_ARRAY_MAX_DEFAULT || '1000'),
  defaultImagesLimit: parseInt(process.env.DEFAULT_IMAGES_LIMIT || '100'),
  defaultImagesPage: 1,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.INCR_MAX_PER_MINUTE || '60')
  }
};

3. Models (Mongoose)
AdminUser
const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','editor'], required: true }
});

Category
const CategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: Boolean, default: true }
}, { timestamps: true });

Image
const ImageSchema = new mongoose.Schema({
  title: String,
  description: String,
  filePath: String,
  fileName: String,
  mimeType: String,
  size: Number,
  width: Number,
  height: Number,
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  status: { type: Boolean, default: true },
  countUsage: { type: Number, default: 0 },
  countFavorite: { type: Number, default: 0 },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });


Thiết lập index:

ImageSchema.index({ categoryIds: 1 })

ImageSchema.index({ createdAt: -1 })

ImageSchema.index({ status: 1 })

4. Middleware xác thực
authJwt.js

Kiểm tra header Authorization: Bearer <token>

Nếu route admin: kiểm tra là JWT hợp lệ, và decode ra role để xác định quyền (admin hoặc editor)

Nếu route public (GET, increment): so sánh token với STATIC_USER_TOKEN từ config

Nếu không hợp lệ → trả HTTP 401

Bạn có thể tách middleware như:

verifyAdminOrEditor — dùng cho route CRUD / upload / metadata

verifyStaticUser — dùng cho public đọc + increment

rateLimiter.js (cho increment API)

Sử dụng express-rate-limit:

const rateLimit = require('express-rate-limit');
const config = require('../config');

const incrementLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please slow down' }
});


Áp dụng limiter vào route POST /api/public/images/:id/increment.

5. Controllers & Service logic
Auth / admin login

Nhận username/password

Tìm AdminUser theo username

So sánh mật khẩu bằng bcrypt.compare

Nếu đúng: tạo JWT chứa { userId, role }, sign với JWT_SECRET, expire theo jwtExpiresIn

Trả token + role

CategoryController

createCategory: nhận title, description, status; tạo document mới

listCategories: query { status: true } hoặc không (tùy design); hỗ trợ page + limit, trả pagination metadata

getCategoryDetail:

Đọc category bằng :id

Nếu không tìm hoặc status=false → 404

Lấy ảnh theo categoryIds chứa category._id, status=true; nếu không có imagesPage/imagesLimit → kiểm tra total count ảnh, nếu vượt imagesArrayMaxDefault → buộc client dùng phân trang hoặc trả lỗi; nếu nhỏ → trả full array sắp theo createdAt: -1

Nếu có imagesPage/imagesLimit: thực hiện .skip()/.limit() + tính tổng count để trả imagesPagination

Hỗ trợ imagesSearch: nếu được cung cấp, filter thêm điều kiện title hoặc description qua regex hoặc text index.

updateCategory: cập nhật title/description/status

deleteCategory: set status = false (soft delete)

ImageController

uploadImages:

Xử lý multipart/form-data (dùng multer hoặc busboy)

Kiểm tra req.files (một hoặc nhiều)

Với mỗi file:

Kiểm MIME, size

Tạo tên file mới (ví dụ: uuid + extension) để tránh trùng

Lưu vào uploadPath

Đọc metadata ảnh (width/height) — có thể dùng sharp hoặc probe-image-size

Tạo document Image với các trường

Kiểm categoryIds[]: for each ensure Category.findById tồn tại và status=true; nếu không, bỏ hoặc reject

Trả kết quả (array of image metadata)

listImages:

Nhận query params: categoryId, page, limit, search, status, sort

Xây điều kiện filter object

Thực hiện .find(), .sort(), .skip(), .limit()

Trả pagination metadata + items

getImageDetail:

Tìm image theo :id, nếu không hoặc status=false → 404

Nếu config bật auto increment usage → thực hiện Image.findByIdAndUpdate(id, { $inc: { countUsage: 1 } }, { new: true })

Trả document image

updateImageMetadata:

Chỉ cập nhật các trường như title, description, status, categoryIds (với validation)

deleteImage:

Soft delete: set status = false

PublicController (increment API)

incrementCounters:

Kiểm route auth via verifyStaticUser

Đọc body { incrementUsage, incrementFavorite } (>= 0)

Thực hiện atomic update trong DB:

const updated = await Image.findByIdAndUpdate(
  id,
  { $inc: { countUsage: incrementUsage, countFavorite: incrementFavorite } },
  { new: true }
);


Nếu image không tồn tại hoặc status=false → trả lỗi (404)

Trả { success: true, image: { id, countUsage, countFavorite } }

Log event (imageId, ip, timestamp, increments) để audit

6. Routing & API wiring

Ví dụ:

// routes/adminRoutes.js
const router = express.Router();
router.post('/login', authController.login);

// routes/categoryRoutes.js
const router = express.Router();
router.get('/', middlewares.verifyStaticUser, categoryController.listCategories);
router.get('/:id', middlewares.verifyStaticUser, categoryController.getCategoryDetail);
router.post('/', middlewares.verifyAdminOrEditor, categoryController.createCategory);
router.put('/:id', middlewares.verifyAdminOrEditor, categoryController.updateCategory);
router.delete('/:id', middlewares.verifyAdminOrEditor, categoryController.deleteCategory);

// routes/imageRoutes.js
const router = express.Router();
router.get('/', middlewares.verifyStaticUser, imageController.listImages);
router.get('/:id', middlewares.verifyStaticUser, imageController.getImageDetail);
router.post('/', middlewares.verifyAdminOrEditor, uploadMiddleware, imageController.uploadImages);
router.put('/:id', middlewares.verifyAdminOrEditor, imageController.updateImageMetadata);
router.delete('/:id', middlewares.verifyAdminOrEditor, imageController.deleteImage);

// routes/publicRoutes.js
const router = express.Router();
router.post('/images/:id/increment', middlewares.verifyStaticUser, rateLimiter.incrementLimiter, publicController.incrementCounters);


Trong app.js, bạn gắn route modules:

app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/public', publicRoutes);


Ngoài ra gắn errorHandler cuối cùng, validateRequest trước các controllers nếu muốn validate schema.

7. Error handling & validation

Dùng Joi hoặc express-validator để validate body / query params (ví dụ: imagesPage, imagesLimit, incrementUsage >= 0, etc.)

Trong controller wrap try/catch, gọi next(err) nếu lỗi bất thường để middleware errorHandler xử lý.

Trả HTTP status codes phù hợp: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404, 500 (server error).

Ở getCategoryDetail, nếu client không dùng phân trang và ảnh count lớn hơn threshold → trả lỗi 400 hoặc trả thông báo “vui lòng phân trang” (hoặc tự fallback sang phân trang).

8. Logging & audit

Dùng winston hoặc pino hoặc bunyan cho logging:

Log mỗi request (method, url, status, response time, user (admin/editor) hoặc ip).

Log error stack trace.

Log mỗi call increment API: ip, imageId, increments, timestamp.

Có thể lưu log vào file hoặc dịch vụ logging tùy sau.

9. Security & hardening

Hash mật khẩu admin sử dụng bcrypt (ví dụ bcrypt.hash with saltRounds).

Không để JWT_SECRET hoặc STATIC_USER_TOKEN lộ ra. Đặt trong ENV file hoặc secrets vault.

Trong upload, kiểm MIME + size + extension whitelist để tránh upload file độc hại.

Không để path traversal: when saving file, sanitize file names, không cho upload file ngoài đường dẫn upload.

CORS: nếu frontend ở domain khác, cấu hình CORS phù hợp.

Rate limiting cho các route nhạy cảm nếu cần (ví dụ login).

Nếu muốn, thêm logging & alert khi token static bị sử dụng quá mức / bất thường.

10. Scaling considerations & performance

Với ảnh nhiều, khi GET /api/categories/:id trả full array có thể gây quá tải — do đó luôn bật threshold, và nếu vượt threshold, bắt buộc client cung cấp pagination.

Đặt limit tối đa (ví dụ 100, 500) cho imagesLimit để tránh trả quá nhiều record trong 1 query.

Sử dụng MongoDB index như đã đề để query nhanh.

Tránh N+1 query: dùng .populate() khi cần, hoặc fetch ảnh riêng.

Khi upload nhiều file cùng lúc, xử lý song song (promise all) hoặc batch insert.

Cẩn trọng memory usage khi đọc ảnh metadata — nếu ảnh lớn, có thể xử lý streaming.

Tương lai: nếu dung lượng ảnh phát triển lớn, xem xét chuyển sang lưu trữ file như S3 / object storage thay vì local filesystem.

11. Testing & QA

Viết unit test / integration test cho controllers, middleware auth, increment API.

Test trường hợp edge: increment với số không hợp lệ, vượt rate limit, upload file không hợp lệ, request phân trang vượt bounds, truy cập không có quyền, token sai.

Kiểm thử tải (stress test) cho route list ảnh, upload nhiều files, increment counters.

12. Deployment & run

Khi deploy, cần tạo đường dẫn upload (folder) có quyền ghi.

Cấu hình biến môi trường (JWT_SECRET, STATIC_USER_TOKEN, UPLOAD_PATH, MAX_IMAGE_SIZE, etc).

Dùng PM2 / Docker / systemd để quản lý.

Đặt backup cho filesystem + MongoDB theo SOP.