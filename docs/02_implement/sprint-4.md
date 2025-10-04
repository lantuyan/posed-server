⚫ Sprint 4 — Integration, Testing & Deployment (VPS Production Ready)

Thời gian: 2025-10-20 → 2025-10-30
Phiên bản: v1.0.0
Trạng thái: 🔄 In Progress

1. 🎯 Mục tiêu chính

Tích hợp hoàn chỉnh Backend + Dashboard, chạy thực tế trên VPS (Ubuntu-based).

Triển khai bằng SSH + PM2, không sử dụng CI/CD cloud (manual deploy).

Thiết lập môi trường vận hành: .env, MongoDB, thư mục uploads/, logging, và backup.

Kiểm thử toàn diện (E2E): từ Dashboard → API → MongoDB.

Đảm bảo hiệu năng, bảo mật, ổn định hệ thống.

Bàn giao tài liệu vận hành và hướng dẫn bảo trì.

2. 🏗️ Hạ tầng triển khai (Environment Setup)
Thành phần	Mô tả	Ghi chú
Server	VPS Ubuntu 22.04, SSH root hoặc user có sudo	Địa chỉ: <server-ip>
Node.js	Phiên bản LTS (>=18.x)	Kiểm tra bằng node -v
MongoDB	Cài đặt local hoặc remote	Dùng database pose_app
PM2	Quản lý tiến trình backend & dashboard	npm i -g pm2
Nginx	Reverse proxy cho backend và dashboard	/etc/nginx/sites-available/pose.conf
Firewall	UFW (mở port 80, 443, 22)	sudo ufw allow 80,443,22/tcp
Storage	/data/uploads/images/ (quyền ghi/đọc)	Tạo thư mục trước deploy
3. ⚙️ Cấu trúc hệ thống khi chạy thực tế
/var/www/pose/
 ├── backend/
 │   ├── src/
 │   ├── .env
 │   ├── package.json
 │   └── logs/
 ├── dashboard/
 │   ├── .next/
 │   ├── package.json
 │   └── out/
 ├── uploads/
 │   └── images/
 └── nginx/
     └── pose.conf


Các service chạy song song:

pose-backend → Node/PM2, cổng 5000

pose-dashboard → Next.js, build static (serve qua Nginx)

4. 🔐 Cấu hình môi trường .env
# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pose_app
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h
STATIC_USER_TOKEN=your_static_token_here
UPLOAD_PATH=/var/www/pose/uploads/images
MAX_IMAGE_SIZE=10485760
IMAGES_ARRAY_MAX_DEFAULT=1000
INCR_MAX_PER_MINUTE=60
NODE_ENV=production

5. ⚡ Quy trình triển khai (Deployment Process)
5.1 Chuẩn bị server (qua SSH)
ssh user@<server-ip>
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git nodejs npm
npm install -g pm2

5.2 Clone code & setup backend
cd /var/www
sudo git clone https://github.com/yourrepo/pose.git
cd pose/backend
npm install
cp .env.example .env   # Điền giá trị thật
mkdir -p /var/www/pose/uploads/images
sudo chown -R www-data:www-data /var/www/pose/uploads

5.3 Start backend với PM2
pm2 start src/server.js --name pose-backend
pm2 save
pm2 startup

5.4 Build dashboard (Next.js)
cd /var/www/pose/dashboard
npm install
npm run build
npm run export


Output sẽ nằm trong /dashboard/out.

5.5 Cấu hình Nginx reverse proxy

/etc/nginx/sites-available/pose.conf

server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/pose/dashboard/out;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}

sudo ln -s /etc/nginx/sites-available/pose.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

6. 🧠 Task Mapping for AI Agent
ID	Lệnh tác vụ	Mô tả chi tiết	Ưu tiên
T1	agent.create_task("integration_backend_dashboard", description="Kết nối dashboard (Next.js) với backend (Express), kiểm thử API thực tế", priority="high")	Test toàn bộ flow CRUD, upload, increment.	🔥
T2	agent.create_task("server_prepare_vps_environment", description="Cấu hình Ubuntu, Node, MongoDB, PM2, Nginx trên VPS có SSH", priority="high")	Chuẩn bị môi trường deploy.	🔥
T3	agent.create_task("deploy_backend_via_ssh", description="SSH vào VPS, clone repo, setup backend, PM2", priority="high")	Cài đặt và chạy backend.	🔥
T4	agent.create_task("deploy_dashboard_static_via_nginx", description="Build Next.js và phục vụ qua Nginx", priority="high")	Serve dashboard tĩnh.	🔥
T5	agent.create_task("configure_nginx_reverse_proxy", description="Cấu hình reverse proxy cho backend /api và dashboard /", priority="high")	Theo mẫu trên.	🔥
T6	agent.create_task("validate_end_to_end", description="Kiểm thử full flow từ dashboard đến backend", priority="high")	Login, CRUD, upload, analytics.	🧪
T7	agent.create_task("setup_logging_and_backup", description="Tạo log rotation và script backup MongoDB + uploads/", priority="medium")	Lưu trữ & backup định kỳ.	⚙️
T8	agent.create_task("security_hardening_vps", description="Cấu hình firewall, disable root SSH, chỉ mở port cần thiết", priority="medium")	Bảo mật cơ bản.	🛡️
7. ✅ Definition of Done (DoD)

 Backend & Dashboard chạy trên VPS thật, truy cập domain hoạt động.

 Reverse proxy hoạt động đúng (api/, static/).

 Upload ảnh thành công, ảnh lưu /uploads/images.

 API increment hoạt động và log đúng.

 Dashboard CRUD, Analytics hiển thị chính xác.

 PM2 restart tự động sau reboot.

 Nginx config hợp lệ, HTTPS (sẵn sàng Let’s Encrypt).

 Script backup MongoDB & uploads hoạt động.

8. 🔍 Kiểm thử End-to-End (E2E Scenarios)
Kiểm thử	Mô tả	Kết quả mong đợi
🧩 Login dashboard	Nhập tài khoản admin hợp lệ	JWT lưu, redirect /categories
🧱 CRUD categories	Tạo/sửa/xóa category từ dashboard	Cập nhật MongoDB
🖼️ Upload ảnh	Upload nhiều ảnh	Lưu file local, hiển thị metadata
📡 Increment counters	Gọi public API	countUsage/favorite tăng đúng
📊 Analytics	Xem tổng usage/favorite	Hiển thị đúng dữ liệu
🌍 Performance	100 GET req trong 1 phút	Không timeout, <500ms/res
🧾 Audit log	Kiểm tra file log	Có ghi increment events
⚙️ PM2 restart	Reboot VPS	Ứng dụng tự chạy lại
🔒 Security	Scan port & token	Không lộ JWT hoặc token tĩnh
9. 💾 Backup & Logging Plan
Logging

Sử dụng winston hoặc pino (đã triển khai trong backend).

Log files:

/var/www/pose/backend/logs/app.log (info)

/var/www/pose/backend/logs/error.log (error)

Backup MongoDB & uploads/

Tạo cron job:

sudo crontab -e
# Backup MongoDB + uploads mỗi đêm 2h sáng
0 2 * * * /var/www/pose/scripts/backup.sh


/var/www/pose/scripts/backup.sh:

#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M)
BACKUP_DIR="/var/backups/pose/$TIMESTAMP"
mkdir -p $BACKUP_DIR
mongodump --db pose_app --out $BACKUP_DIR/mongodb
tar -czf $BACKUP_DIR/uploads.tar.gz /var/www/pose/uploads/images/
find /var/backups/pose/ -type d -mtime +7 -exec rm -rf {} \;

10. 🛡️ Bảo mật hệ thống (Security Hardening)
Hạng mục	Mô tả	Trạng thái
🔑 SSH	Tắt login root, chỉ dùng user có sudo	✅
🔒 Firewall	Mở cổng 22, 80, 443	✅
🔏 Tokens	ENV không public, JWT_SECRET bí mật	✅
⚙️ Upload	MIME whitelist, size limit 10MB	✅
🧠 Rate limit	/api/public/images/:id/increment ≤ 60 req/min	✅
🧾 Logs	Audit increment có IP + imageId	✅
11. 📈 Kế hoạch bàn giao cuối sprint
Deliverable	Mô tả
✅ Backend & Dashboard chạy trên VPS	Domain public hoạt động
✅ Reverse Proxy	/api và / hoạt động ổn định
✅ PM2 Process	Tự khởi động lại khi reboot
✅ Backup & Logging	Script hoạt động hàng ngày
✅ E2E Tests	Tất cả use-case chính pass
✅ Tài liệu vận hành	docs/ops.md (viết sau bàn giao)