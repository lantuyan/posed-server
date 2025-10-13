# 🛠️ Pose Server - Server Setup Guide

## 📋 Hướng dẫn setup môi trường server

### 1. Cài đặt môi trường cần thiết

```bash
# Upload script lên server
scp setup-server.sh user@your-server:/home/user/

# SSH vào server và chạy
ssh user@your-server
chmod +x setup-server.sh
./setup-server.sh
```

Script sẽ tự động cài đặt:
- ✅ Node.js 20+
- ✅ npm
- ✅ MongoDB
- ✅ PM2
- ✅ Nginx (optional)
- ✅ Git
- ✅ UFW Firewall

### 2. Clone/Pull code từ Git

```bash
# Clone repository (nếu chưa có)
git clone <your-repository-url>
cd posed-server

# Hoặc pull code mới (nếu đã có)
git pull origin main
```

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Tạo file .env

```bash
# Copy template (nếu có)
cp .env.example .env

# Hoặc tạo mới
nano .env
```

Nội dung file `.env`:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/posed-server
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
STATIC_USER_TOKEN=your-static-user-token-for-public-api
UPLOAD_PATH=uploads/images
MAX_IMAGE_SIZE=10485760
IMAGES_ARRAY_MAX_DEFAULT=1000
DEFAULT_IMAGES_LIMIT=100
INCR_MAX_PER_MINUTE=60
```

**Lưu ý:** Thay đổi `JWT_SECRET` và `STATIC_USER_TOKEN` thành giá trị bảo mật của bạn.

### 5. Tạo admin user

#### Option 1: Sử dụng script helper (dễ nhất)
```bash
# Tương tác - script sẽ hỏi thông tin
./create-admin.sh

# Hoặc truyền trực tiếp
./create-admin.sh <username> <password> [role]

# Ví dụ:
./create-admin.sh myadmin mypassword123
./create-admin.sh superuser SecurePass456! admin
```

#### Option 2: Sử dụng npm script
```bash
# Tạo admin với thông tin mặc định (admin/admin123)
npm run setup:admin
```

#### Option 3: Chạy trực tiếp
```bash
# Tạo admin với thông tin tùy chỉnh
node scripts/setup-admin.js <username> <password> [role]

# Ví dụ:
node scripts/setup-admin.js myadmin mypassword123 admin
node scripts/setup-admin.js superuser SecurePass456! admin
```

### 6. Chạy ứng dụng

#### Option 1: Chạy trực tiếp
```bash
npm start
```

#### Option 2: Chạy với PM2 (khuyến nghị)
```bash
# Chạy với PM2
pm2 start server.js --name "posed-server"

# Hoặc sử dụng ecosystem file
pm2 start ecosystem.config.js

# Lưu PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

### 7. Cấu hình Nginx (optional)

```bash
# Tạo config
sudo nano /etc/nginx/sites-available/posed-server
```

Nội dung:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/posed-server /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Kiểm tra

```bash
# Kiểm tra services
sudo systemctl status mongod
sudo systemctl status nginx
pm2 status

# Kiểm tra ứng dụng
curl http://localhost:3000/health
curl http://your-domain.com/health
```

## 🛠️ Quản lý

```bash
# PM2 commands
pm2 list
pm2 logs posed-server
pm2 restart posed-server
pm2 stop posed-server
pm2 delete posed-server

# MongoDB
sudo systemctl restart mongod
sudo systemctl status mongod

# Nginx
sudo systemctl restart nginx
sudo nginx -t
```

## 📝 Ghi chú

- Script setup chỉ cài đặt môi trường, không cài đặt ứng dụng
- Bạn cần tự pull code và cấu hình
- Đảm bảo có quyền sudo trên server
- Yêu cầu internet để download packages
