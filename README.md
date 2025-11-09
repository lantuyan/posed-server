# Pose Server - Backend API

Backend server for Pose application built with Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Prerequisites

- Node.js (v20+)
- MongoDB Community Edition
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd posed-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # On other systems, start MongoDB service
   ```

4. **Create admin user**
   ```bash
   npm run setup:admin
   ```
   Default credentials: `admin` / `admin123`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route handlers
├── middlewares/     # Express middlewares
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utility functions
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/posed-server

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h

# Static User Token for Public API
STATIC_USER_TOKEN=your-static-user-token-for-public-api-change-this-in-production

# Upload Configuration
UPLOAD_PATH=uploads/images
MAX_IMAGE_SIZE=10485760
IMAGES_ARRAY_MAX_DEFAULT=1000
DEFAULT_IMAGES_LIMIT=100

# Rate Limiting
INCR_MAX_PER_MINUTE=60

# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000

# SSL Configuration (tự động cấu hình bởi start.sh)
USE_HTTPS=false
SSL_KEY_PATH=
SSL_CERT_PATH=
SSL_FULLCHAIN_PATH=
```

## 🔐 Authentication

### Admin/Editor Authentication
- **Endpoint**: `POST /api/admin/login`
- **Body**: `{ "username": "admin", "password": "admin123" }`
- **Response**: JWT token with user role

### Public API Authentication
- **Header**: `Authorization: Bearer <STATIC_USER_TOKEN>`
- **Used for**: Public endpoints (GET categories, GET images, increment counters)

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📊 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/test-admin` - Test admin auth (requires JWT)
- `GET /api/admin/test-public` - Test public auth (requires static token)

### Health Check
- `GET /health` - Server status

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run setup:admin` - Create admin user

### Database Setup

The application automatically connects to MongoDB and creates necessary indexes. Admin users can be created using the setup script.

## 🔒 Security Features

- JWT-based authentication for admin/editor
- Static token authentication for public API
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- Helmet.js for security headers
- CORS configuration
- Password hashing with bcrypt

## 📝 Logging

The application uses Winston for logging:
- Console output in development
- File logging in `logs/` directory
- Request/response logging
- Error tracking
- Audit logging for sensitive operations

## 🚀 Deployment

### Quick Setup với Auto-Configuration Script

Sau khi pull code từ server, chạy script tự động để cấu hình toàn bộ:

```bash
# Cấp quyền thực thi (chỉ cần làm 1 lần)
chmod +x start.sh

# Chạy script setup và start
./start.sh
```

Script này sẽ tự động:
- ✅ Kiểm tra và cài đặt dependencies (Node.js, npm, PM2, certbot)
- ✅ Tạo file `.env` nếu chưa có
- ✅ Cài đặt npm packages
- ✅ Cấu hình SSL với Let's Encrypt (hoạt động với Cloudflare) dựa trên `API_BASE_URL` trong `.env`
- ✅ Cấu hình PM2 để chạy server
- ✅ Khởi động server với PM2
- ✅ Cấu hình PM2 startup để tự động khởi động khi server reboot

### Manual Deployment

1. Set production environment variables trong file `.env`
2. Đảm bảo `API_BASE_URL` trong `.env` trỏ đúng domain của bạn
3. Build and start the application:
   ```bash
   npm start
   ```
4. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### SSL Configuration với Cloudflare

Script `start.sh` tự động cấu hình SSL với Let's Encrypt. Đảm bảo:
- Domain trong `API_BASE_URL` đã trỏ về IP server
- Port 80 và 443 đã mở trên firewall
- Nginx (nếu có) đã được cấu hình đúng

Sau khi cài đặt, certificate sẽ được tự động renew bởi certbot.

## 📚 Documentation

- [Project Requirements](docs/00_context/requirements.md)
- [Implementation Guide](docs/00_context/implementation-guide.md)
- [Project Roadmap](docs/01_plan/project-roadmap.md)
- [Sprint Plans](docs/02_implement/)

## 🤝 Contributing

1. Follow the project structure
2. Write tests for new features
3. Ensure all tests pass
4. Follow the coding standards
5. Update documentation as needed

## 📄 License

ISC License

