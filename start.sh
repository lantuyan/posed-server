#!/bin/bash

# 🚀 Pose Server - Auto Setup & Start Script
# Script tự động cấu hình server, SSL với Cloudflare và chạy trên PM2
# Sử dụng: ./start.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Pose Server - Auto Setup & Start Script         ║"
echo "║  Tự động cấu hình server, SSL và chạy trên PM2     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra quyền root và thiết lập SUDO prefix
if [[ $EUID -eq 0 ]]; then
    log_warning "Đang chạy với quyền root. Một số lệnh sẽ không cần sudo."
    SUDO_PREFIX=""
else
    SUDO_PREFIX="sudo"
fi

# ============================================
# BƯỚC 1: Kiểm tra và cài đặt dependencies
# ============================================
log_step "Bước 1: Kiểm tra và cài đặt dependencies..."

# Kiểm tra và cài đặt Node.js
if ! command -v node &> /dev/null; then
    log_warning "Node.js chưa được cài đặt, đang cài đặt..."
    
    # Cài đặt dependencies cần thiết
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq curl ca-certificates gnupg
    
    # Cài đặt Node.js 20.x từ NodeSource
    log_info "Đang cài đặt Node.js 20.x từ NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO_PREFIX -E bash - > /dev/null 2>&1
    $SUDO_PREFIX apt-get install -y -qq nodejs
    
    if command -v node &> /dev/null; then
        log_success "Node.js $(node -v) đã được cài đặt"
    else
        log_error "Không thể cài đặt Node.js. Vui lòng cài đặt thủ công."
        exit 1
    fi
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
        log_warning "Node.js version $(node -v) quá cũ (cần >= 18.x), đang cài đặt Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO_PREFIX -E bash - > /dev/null 2>&1
        $SUDO_PREFIX apt-get install -y -qq nodejs
        log_success "Node.js đã được cập nhật lên $(node -v)"
    else
        log_success "Node.js $(node -v) đã có sẵn"
    fi
fi

# Kiểm tra và cài đặt npm
if ! command -v npm &> /dev/null; then
    log_warning "npm chưa được cài đặt, đang cài đặt..."
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq npm
    
    if command -v npm &> /dev/null; then
        log_success "npm $(npm -v) đã được cài đặt"
    else
        log_error "Không thể cài đặt npm. Vui lòng cài đặt thủ công."
        exit 1
    fi
else
    log_success "npm $(npm -v) đã có sẵn"
fi

# Kiểm tra PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 chưa được cài đặt, đang cài đặt..."
    $SUDO_PREFIX npm install -g pm2
    log_success "PM2 đã được cài đặt"
else
    log_success "PM2 $(pm2 -v) đã có sẵn"
fi

# Kiểm tra certbot (cho SSL)
if ! command -v certbot &> /dev/null; then
    log_warning "Certbot chưa được cài đặt, đang cài đặt..."
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq certbot
    log_success "Certbot đã được cài đặt"
else
    log_success "Certbot đã có sẵn"
fi

# ============================================
# BƯỚC 2: Kiểm tra và tạo file .env
# ============================================
log_step "Bước 2: Kiểm tra file .env..."

if [ ! -f .env ]; then
    log_warning "File .env không tồn tại, đang tạo file mẫu..."
    cat > .env << 'EOF'
# Database
MONGODB_URI=mongodb://localhost:27017/posed-server

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=1h

# Static User Token for Public API
STATIC_USER_TOKEN=your-static-token-change-this

# Server Configuration
PORT=3000
NODE_ENV=production
BASE_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com

# Upload Configuration
UPLOAD_PATH=uploads/images
MAX_IMAGE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# SSL Configuration (sẽ được cấu hình tự động)
USE_HTTPS=false
SSL_KEY_PATH=
SSL_CERT_PATH=
SSL_FULLCHAIN_PATH=
# SSL_PIN_HASH - Optional: Chỉ cần nếu muốn dùng endpoint /api/ssl-pin-info
# Nếu client app hardcode pin hash, không cần thiết lưu ở đây
SSL_PIN_HASH=
EOF
    log_warning "Đã tạo file .env mẫu. VUI LÒNG CẬP NHẬT CÁC GIÁ TRỊ CẦN THIẾT!"
    log_info "Đặc biệt quan trọng: Cập nhật API_BASE_URL với domain của bạn"
    read -p "Nhấn Enter để tiếp tục sau khi đã cập nhật .env..."
else
    log_success "File .env đã tồn tại"
fi

# Load .env để lấy API_BASE_URL (sử dụng grep để tránh lỗi với source)
API_BASE_URL=$(grep -E "^API_BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")

# Nếu không có API_BASE_URL, thử dùng BASE_URL
if [ -z "$API_BASE_URL" ] || [ "$API_BASE_URL" = "https://yourdomain.com" ] || [ "$API_BASE_URL" = "http://localhost:3000" ]; then
    API_BASE_URL=$(grep -E "^BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
fi

# Kiểm tra API_BASE_URL
if [ -z "$API_BASE_URL" ] || [ "$API_BASE_URL" = "https://yourdomain.com" ] || [ "$API_BASE_URL" = "http://localhost:3000" ]; then
    log_error "API_BASE_URL hoặc BASE_URL chưa được cấu hình trong .env!"
    log_info "Vui lòng cập nhật API_BASE_URL trong file .env với domain của bạn"
    log_info "Ví dụ: API_BASE_URL=https://pose.sixpilot.technology"
    exit 1
fi

log_success "API_BASE_URL: $API_BASE_URL"

# Extract domain từ API_BASE_URL
DOMAIN=$(echo "$API_BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
log_info "Domain được phát hiện: $DOMAIN"

# ============================================
# BƯỚC 3: Cài đặt npm packages
# ============================================
log_step "Bước 3: Cài đặt npm packages..."

if [ ! -d "node_modules" ]; then
    log_info "Đang cài đặt dependencies..."
    npm install
    log_success "Dependencies đã được cài đặt"
else
    log_info "Đang cập nhật dependencies..."
    npm install
    log_success "Dependencies đã được cập nhật"
fi

# ============================================
# BƯỚC 4: Cấu hình SSL với Cloudflare
# ============================================
log_step "Bước 4: Cấu hình SSL với Cloudflare..."

# Kiểm tra xem đã có certificate chưa
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$CERT_PATH" ]; then
    log_warning "Certificate SSL chưa được cấu hình cho domain: $DOMAIN"
    log_info "Đang cấu hình SSL với Let's Encrypt (hoạt động với Cloudflare)..."
    
    # Kiểm tra xem port 80 có đang được sử dụng không
    PORT80_PID=""
    PORT80_PROCESS=""
    if command -v lsof &> /dev/null; then
        PORT80_PID=$($SUDO_PREFIX lsof -Pi :80 -sTCP:LISTEN -t 2>/dev/null | head -1 || echo "")
        if [ -n "$PORT80_PID" ]; then
            PORT80_PROCESS=$($SUDO_PREFIX ps -p "$PORT80_PID" -o comm= 2>/dev/null || echo "unknown")
            log_warning "Port 80 đang được sử dụng bởi process: $PORT80_PROCESS (PID: $PORT80_PID)"
        fi
    fi
    
    log_info "Đang yêu cầu certificate từ Let's Encrypt..."
    log_warning "LƯU Ý: Domain $DOMAIN phải trỏ về IP server này và port 80/443 phải mở"
    
    # Kiểm tra xem có muốn dùng DNS validation không (nếu port 80 bị chiếm)
    USE_DNS_VALIDATION=false
    if [ -n "$PORT80_PID" ]; then
        log_warning "Port 80 đang bị chiếm. Bạn có 2 lựa chọn:"
        log_info "1. Dùng DNS validation (khuyến nghị) - không cần port 80"
        log_info "2. Dừng process đang dùng port 80 và dùng HTTP validation"
        read -p "Bạn muốn dùng DNS validation? (y/n - mặc định: y): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            USE_DNS_VALIDATION=true
        fi
    fi
    
    if [ "$USE_DNS_VALIDATION" = true ]; then
        log_info "Sử dụng DNS validation với Cloudflare..."
        log_info "Chạy script setup-ssl-cloudflare.sh..."
        if [ -f "scripts/setup-ssl-cloudflare.sh" ]; then
            chmod +x scripts/setup-ssl-cloudflare.sh
            ./scripts/setup-ssl-cloudflare.sh
        else
            log_error "Script setup-ssl-cloudflare.sh không tồn tại!"
            log_info "Bạn có thể cài đặt SSL sau bằng:"
            log_info "1. Cài đặt python3-certbot-dns-cloudflare: $SUDO_PREFIX apt-get install -y python3-certbot-dns-cloudflare"
            log_info "2. Chạy: $SUDO_PREFIX certbot certonly --dns-cloudflare --dns-cloudflare-credentials cloudflare.ini -d $DOMAIN"
        fi
    else
        # Sử dụng standalone mode (yêu cầu tạm dừng web server)
        read -p "Bạn có muốn cài đặt SSL certificate ngay bây giờ? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Kill tất cả process đang dùng port 80
            PORT80_PIDS=()
            if command -v lsof &> /dev/null; then
                PORT80_PIDS=($($SUDO_PREFIX lsof -ti :80 2>/dev/null || echo ""))
            elif command -v fuser &> /dev/null; then
                PORT80_PIDS=($($SUDO_PREFIX fuser 80/tcp 2>/dev/null | awk '{print $1}' || echo ""))
            fi
            
            if [ ${#PORT80_PIDS[@]} -gt 0 ]; then
                log_warning "Đang kill process đang dùng port 80..."
                for pid in "${PORT80_PIDS[@]}"; do
                    if [ -n "$pid" ]; then
                        PROCESS_NAME=$($SUDO_PREFIX ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                        log_info "Killing process: $PROCESS_NAME (PID: $pid)"
                        $SUDO_PREFIX kill -9 "$pid" 2>/dev/null || true
                        sleep 1
                    fi
                done
                log_success "Đã kill tất cả process đang dùng port 80"
            fi
            
            # Tạm dừng Nginx nếu đang chạy (chỉ nếu Nginx đã được cài đặt)
            NGINX_STOPPED=false
            if $SUDO_PREFIX systemctl list-unit-files | grep -q "nginx.service" 2>/dev/null; then
                if $SUDO_PREFIX systemctl is-active --quiet nginx 2>/dev/null; then
                    log_info "Tạm dừng Nginx để cấu hình SSL..."
                    $SUDO_PREFIX systemctl stop nginx
                    NGINX_STOPPED=true
                fi
            else
                log_info "Nginx chưa được cài đặt, bỏ qua"
            fi
            
            # Yêu cầu certificate
            $SUDO_PREFIX certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
                log_error "Không thể cài đặt certificate. Vui lòng kiểm tra:"
                log_info "1. Domain $DOMAIN có trỏ về IP server này không?"
                log_info "2. Port 80 và 443 có mở không?"
                log_info "3. Firewall có cho phép kết nối không?"
                log_info "4. Hoặc thử dùng DNS validation: ./scripts/setup-ssl-cloudflare.sh"
                
                # Khởi động lại Nginx nếu đã dừng
                if [ "$NGINX_STOPPED" = true ] && $SUDO_PREFIX systemctl list-unit-files | grep -q "nginx.service" 2>/dev/null; then
                    $SUDO_PREFIX systemctl start nginx 2>/dev/null || true
                fi
                exit 1
            }
            
            # Khởi động lại Nginx nếu đã dừng (chỉ nếu Nginx đã được cài đặt)
            if [ "$NGINX_STOPPED" = true ] && $SUDO_PREFIX systemctl list-unit-files | grep -q "nginx.service" 2>/dev/null; then
                log_info "Khởi động lại Nginx..."
                $SUDO_PREFIX systemctl start nginx 2>/dev/null || log_warning "Không thể khởi động lại Nginx"
            fi
            
            log_success "Certificate đã được cài đặt thành công!"
        else
            log_warning "Bỏ qua cài đặt SSL. Bạn có thể cài đặt sau bằng:"
            log_info "1. HTTP validation: $SUDO_PREFIX certbot certonly --standalone -d $DOMAIN"
            log_info "2. DNS validation (Cloudflare): ./scripts/setup-ssl-cloudflare.sh"
        fi
    fi
else
    log_success "Certificate SSL đã tồn tại cho domain: $DOMAIN"
fi

# Cập nhật .env với đường dẫn certificate
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    log_info "Cập nhật .env với đường dẫn certificate..."
    
    # Backup .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Cập nhật SSL paths trong .env
    if grep -q "USE_HTTPS=" .env; then
        sed -i "s|USE_HTTPS=.*|USE_HTTPS=true|" .env
    else
        echo "USE_HTTPS=true" >> .env
    fi
    
    if grep -q "SSL_KEY_PATH=" .env; then
        sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=$KEY_PATH|" .env
    else
        echo "SSL_KEY_PATH=$KEY_PATH" >> .env
    fi
    
    if grep -q "SSL_CERT_PATH=" .env; then
        sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=$CERT_PATH|" .env
    else
        echo "SSL_CERT_PATH=$CERT_PATH" >> .env
    fi
    
    if grep -q "SSL_FULLCHAIN_PATH=" .env; then
        sed -i "s|SSL_FULLCHAIN_PATH=.*|SSL_FULLCHAIN_PATH=$CERT_PATH|" .env
    else
        echo "SSL_FULLCHAIN_PATH=$CERT_PATH" >> .env
    fi
    
    log_success "Đã cập nhật .env với cấu hình SSL"
    
    # Extract SSL pin hash (để copy vào client app)
    # LƯU Ý: Nếu client app sẽ hardcode certificate/pin hash, không cần lưu vào .env
    # Pin hash được lưu vào certs/pin-hash.txt để developer copy vào client app
    log_info "Đang extract SSL pin hash từ certificate..."
    log_info "Pin hash sẽ được lưu vào certs/pin-hash.txt để copy vào client app"
    
    # Tạo thư mục certs nếu chưa có
    mkdir -p certs
    
    # Chạy extract-pin script và lưu output
    if node scripts/extract-pin.js "$CERT_PATH" > /tmp/ssl-pin-output.txt 2>&1; then
        # Đọc pin hash từ file pin-hash.txt (script extract-pin.js tự động lưu vào đó)
        PIN_HASH_FILE="certs/pin-hash.txt"
        if [ -f "$PIN_HASH_FILE" ]; then
            PIN_HASH=$(cat "$PIN_HASH_FILE" | tr -d '\n' | xargs)
            
            if [ -n "$PIN_HASH" ]; then
                log_success "Đã extract SSL pin hash thành công"
                log_info "Pin hash đã được lưu vào: $PIN_HASH_FILE"
                log_info "SSL Pin Hash: $PIN_HASH"
                log_info ""
                log_info "📋 Bước tiếp theo:"
                log_info "   1. Copy pin hash trên vào client app (iOS/Android)"
                log_info "   2. Hardcode pin hash trong client app để implement SSL pinning"
                log_info "   3. Xem hướng dẫn: cat ssl-pinning-guide.md"
                log_info ""
                
                # Optional: Lưu vào .env nếu cần (cho endpoint /api/ssl-pin-info)
                # Nếu client app hardcode pin hash, không cần lưu vào .env
                read -p "Bạn có muốn lưu pin hash vào .env? (y/n - mặc định: n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    if grep -q "SSL_PIN_HASH=" .env; then
                        sed -i.bak "s|SSL_PIN_HASH=.*|SSL_PIN_HASH=$PIN_HASH|" .env
                        rm -f .env.bak
                    else
                        echo "SSL_PIN_HASH=$PIN_HASH" >> .env
                    fi
                    log_success "Đã lưu SSL pin hash vào .env (cho endpoint /api/ssl-pin-info)"
                else
                    log_info "Bỏ qua lưu vào .env (client app sẽ hardcode pin hash)"
                fi
            else
                log_warning "Pin hash file tồn tại nhưng rỗng"
            fi
        else
            # Fallback: thử extract từ output text
            PIN_HASH=$(grep -E 'pin-sha256="[^"]+"' /tmp/ssl-pin-output.txt | head -1 | sed -E 's/.*pin-sha256="([^"]+)".*/\1/' || echo "")
            if [ -n "$PIN_HASH" ]; then
                log_success "Đã extract SSL pin hash từ output"
                log_info "SSL Pin Hash: $PIN_HASH"
                
                # Lưu vào file
                echo "$PIN_HASH" > "$PIN_HASH_FILE"
                log_success "Đã lưu pin hash vào: $PIN_HASH_FILE"
                
                # Optional: Lưu vào .env
                read -p "Bạn có muốn lưu pin hash vào .env? (y/n - mặc định: n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    if grep -q "SSL_PIN_HASH=" .env; then
                        sed -i.bak "s|SSL_PIN_HASH=.*|SSL_PIN_HASH=$PIN_HASH|" .env
                        rm -f .env.bak
                    else
                        echo "SSL_PIN_HASH=$PIN_HASH" >> .env
                    fi
                    log_success "Đã lưu SSL pin hash vào .env"
                else
                    log_info "Bỏ qua lưu vào .env (client app sẽ hardcode pin hash)"
                fi
            else
                log_warning "Không thể extract pin hash. Bạn có thể chạy sau: npm run extract-pin $CERT_PATH"
            fi
        fi
        rm -f /tmp/ssl-pin-output.txt
    else
        log_warning "Không thể extract SSL pin hash. Bạn có thể chạy sau: npm run extract-pin $CERT_PATH"
    fi
fi

# ============================================
# BƯỚC 5: Cấu hình PM2
# ============================================
log_step "Bước 5: Cấu hình PM2..."

# Kiểm tra xem đã có ecosystem config chưa
if [ ! -f "ecosystem.config.js" ]; then
    log_info "Đang tạo file cấu hình PM2..."
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'posed-server',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000
  }]
};
EOF
    log_success "Đã tạo file ecosystem.config.js"
else
    log_success "File ecosystem.config.js đã tồn tại"
fi

# Tạo thư mục logs nếu chưa có
mkdir -p logs
log_success "Thư mục logs đã sẵn sàng"

# ============================================
# BƯỚC 6: Cài đặt và cấu hình Nginx
# ============================================
log_step "Bước 6: Cài đặt và cấu hình Nginx..."

# Cài đặt Nginx nếu chưa có
if ! command -v nginx &> /dev/null; then
    log_warning "Nginx chưa được cài đặt, đang cài đặt..."
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq nginx
    log_success "Nginx đã được cài đặt"
else
    log_success "Nginx $(nginx -v 2>&1 | cut -d'/' -f2) đã có sẵn"
fi

# Cấu hình Nginx reverse proxy
NGINX_CONFIG="/etc/nginx/sites-available/posed-server"
NGINX_ENABLED="/etc/nginx/sites-enabled/posed-server"

log_info "Đang cấu hình Nginx reverse proxy cho domain: $DOMAIN"

# Tạo cấu hình Nginx
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    # Cấu hình với HTTPS
    $SUDO_PREFIX tee "$NGINX_CONFIG" > /dev/null << EOF
# Nginx configuration for Pose Server
# Auto-generated by start.sh

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/posed-server-access.log;
    error_log /var/log/nginx/posed-server-error.log;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
else
    # Cấu hình chỉ HTTP (không có SSL)
    log_warning "SSL chưa được cấu hình, đang tạo cấu hình HTTP..."
    $SUDO_PREFIX tee "$NGINX_CONFIG" > /dev/null << EOF
# Nginx configuration for Pose Server
# Auto-generated by start.sh
# WARNING: HTTP only - SSL not configured

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Logging
    access_log /var/log/nginx/posed-server-access.log;
    error_log /var/log/nginx/posed-server-error.log;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
fi

# Xóa default site nếu có và enable site mới
if [ -L /etc/nginx/sites-enabled/default ]; then
    log_info "Đang xóa default site..."
    $SUDO_PREFIX rm -f /etc/nginx/sites-enabled/default
fi

# Enable site
if [ ! -L "$NGINX_ENABLED" ]; then
    $SUDO_PREFIX ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    log_success "Đã enable Nginx site"
fi

# Test Nginx configuration
log_info "Đang kiểm tra cấu hình Nginx..."
if $SUDO_PREFIX nginx -t 2>/dev/null; then
    log_success "Cấu hình Nginx hợp lệ"
    
    # Reload Nginx
    if $SUDO_PREFIX systemctl is-active --quiet nginx; then
        log_info "Đang reload Nginx..."
        $SUDO_PREFIX systemctl reload nginx
    else
        log_info "Đang khởi động Nginx..."
        $SUDO_PREFIX systemctl start nginx
    fi
    
    # Enable Nginx để tự động khởi động
    $SUDO_PREFIX systemctl enable nginx > /dev/null 2>&1
    log_success "Nginx đã được cấu hình và khởi động"
else
    log_error "Cấu hình Nginx không hợp lệ!"
    $SUDO_PREFIX nginx -t
    exit 1
fi

# ============================================
# BƯỚC 7: Cấu hình Firewall
# ============================================
log_step "Bước 7: Cấu hình Firewall..."

# Cài đặt UFW nếu chưa có
if ! command -v ufw &> /dev/null; then
    log_warning "UFW chưa được cài đặt, đang cài đặt..."
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq ufw
    log_success "UFW đã được cài đặt"
fi

# Kiểm tra trạng thái firewall
UFW_STATUS=$($SUDO_PREFIX ufw status | head -n1 | awk '{print $2}')

if [ "$UFW_STATUS" = "inactive" ]; then
    log_info "Đang cấu hình firewall..."
    
    # Reset firewall rules (cẩn thận!)
    $SUDO_PREFIX ufw --force reset > /dev/null 2>&1
    
    # Cho phép SSH (quan trọng!)
    $SUDO_PREFIX ufw allow ssh > /dev/null 2>&1
    $SUDO_PREFIX ufw allow 22/tcp > /dev/null 2>&1
    
    # Cho phép HTTP và HTTPS
    $SUDO_PREFIX ufw allow 80/tcp > /dev/null 2>&1
    $SUDO_PREFIX ufw allow 443/tcp > /dev/null 2>&1
    
    # Cho phép port Node.js (nếu cần truy cập trực tiếp)
    $SUDO_PREFIX ufw allow 3000/tcp > /dev/null 2>&1
    
    # Enable firewall
    $SUDO_PREFIX ufw --force enable > /dev/null 2>&1
    
    log_success "Firewall đã được cấu hình và kích hoạt"
    log_info "Firewall rules: SSH (22), HTTP (80), HTTPS (443), Node.js (3000)"
else
    log_info "Firewall đã được kích hoạt"
    
    # Đảm bảo các port cần thiết đã được mở
    if ! $SUDO_PREFIX ufw status | grep -q "80/tcp"; then
        log_info "Đang mở port 80..."
        $SUDO_PREFIX ufw allow 80/tcp > /dev/null 2>&1
    fi
    
    if ! $SUDO_PREFIX ufw status | grep -q "443/tcp"; then
        log_info "Đang mở port 443..."
        $SUDO_PREFIX ufw allow 443/tcp > /dev/null 2>&1
    fi
    
    if ! $SUDO_PREFIX ufw status | grep -q "3000/tcp"; then
        log_info "Đang mở port 3000..."
        $SUDO_PREFIX ufw allow 3000/tcp > /dev/null 2>&1
    fi
fi

# ============================================
# BƯỚC 8: Kiểm tra và cài đặt MongoDB
# ============================================
log_step "Bước 8: Kiểm tra và cài đặt MongoDB..."

if command -v mongod &> /dev/null; then
    if $SUDO_PREFIX systemctl is-active --quiet mongod; then
        log_success "MongoDB đang chạy"
    else
        log_warning "MongoDB chưa chạy, đang khởi động..."
        $SUDO_PREFIX systemctl start mongod
        $SUDO_PREFIX systemctl enable mongod
        log_success "MongoDB đã được khởi động"
    fi
else
    log_warning "MongoDB chưa được cài đặt, đang cài đặt..."
    
    # Detect Ubuntu version
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        UBUNTU_VERSION=$(echo "$VERSION_ID" | cut -d'.' -f1)
    else
        UBUNTU_VERSION="22"  # Default to jammy
    fi
    
    # Map Ubuntu version to MongoDB repo codename
    case "$UBUNTU_VERSION" in
        20)
            CODENAME="focal"
            ;;
        22)
            CODENAME="jammy"
            ;;
        24)
            CODENAME="noble"
            ;;
        *)
            CODENAME="jammy"  # Default
            log_warning "Không xác định được Ubuntu version, sử dụng jammy (22.04)"
            ;;
    esac
    
    log_info "Đang cài đặt MongoDB cho Ubuntu $UBUNTU_VERSION ($CODENAME)..."
    
    # Install dependencies
    $SUDO_PREFIX apt-get update -qq
    $SUDO_PREFIX apt-get install -y -qq wget gnupg
    
    # Add MongoDB GPG key
    if [ ! -f /usr/share/keyrings/mongodb-server-7.0.gpg ]; then
        log_info "Đang thêm MongoDB GPG key..."
        $SUDO_PREFIX wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | $SUDO_PREFIX gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    fi
    
    # Add MongoDB repository
    if [ ! -f /etc/apt/sources.list.d/mongodb-org-7.0.list ]; then
        log_info "Đang thêm MongoDB repository..."
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/7.0 multiverse" | $SUDO_PREFIX tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
        $SUDO_PREFIX apt-get update -qq
    fi
    
    # Install MongoDB
    log_info "Đang cài đặt MongoDB..."
    $SUDO_PREFIX apt-get install -y -qq mongodb-org
    
    # Start and enable MongoDB
    $SUDO_PREFIX systemctl enable mongod > /dev/null 2>&1
    $SUDO_PREFIX systemctl start mongod
    
    # Wait a bit for MongoDB to start
    sleep 2
    
    if $SUDO_PREFIX systemctl is-active --quiet mongod; then
        log_success "MongoDB đã được cài đặt và khởi động thành công"
    else
        log_error "MongoDB đã được cài đặt nhưng không thể khởi động"
        log_info "Kiểm tra logs: $SUDO_PREFIX journalctl -u mongod -n 50"
        log_warning "Bạn có thể cần cấu hình MongoDB hoặc cập nhật MONGODB_URI trong .env để trỏ đến MongoDB instance khác"
    fi
fi

# ============================================
# BƯỚC 9: Setup admin user (nếu cần)
# ============================================
log_step "Bước 9: Kiểm tra admin user..."

read -p "Bạn có muốn tạo admin user mới? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Đang chạy script setup admin..."
    npm run setup:admin
fi

# ============================================
# BƯỚC 10: Dọn dẹp và khởi động server với PM2
# ============================================
log_step "Bước 10: Dọn dẹp và khởi động server với PM2..."

# Dừng tất cả PM2 processes cũ (trừ posed-server sẽ được xử lý riêng)
log_info "Đang dừng tất cả PM2 processes cũ..."
pm2 delete all 2>/dev/null || true
sleep 2

# Kill process đang dùng port 3000 (nếu có)
log_info "Đang kiểm tra và giải phóng port 3000..."
PORT_3000_PID=""
if command -v lsof &> /dev/null; then
    PORT_3000_PID=$($SUDO_PREFIX lsof -ti :3000 2>/dev/null || echo "")
elif command -v fuser &> /dev/null; then
    PORT_3000_PID=$($SUDO_PREFIX fuser 3000/tcp 2>/dev/null | awk '{print $1}' || echo "")
elif command -v netstat &> /dev/null; then
    PORT_3000_PID=$($SUDO_PREFIX netstat -tlnp 2>/dev/null | grep ':3000' | awk '{print $7}' | cut -d'/' -f1 | head -1 || echo "")
fi

if [ -n "$PORT_3000_PID" ]; then
    # Loại bỏ các ký tự không phải số
    PORT_3000_PID=$(echo "$PORT_3000_PID" | tr -cd '0-9\n' | head -1)
    
    if [ -n "$PORT_3000_PID" ] && [ "$PORT_3000_PID" -gt 0 ] 2>/dev/null; then
        PROCESS_NAME=$($SUDO_PREFIX ps -p "$PORT_3000_PID" -o comm= 2>/dev/null || echo "unknown")
        log_warning "Port 3000 đang được sử dụng bởi process: $PROCESS_NAME (PID: $PORT_3000_PID)"
        log_info "Đang kill process này..."
        $SUDO_PREFIX kill -9 "$PORT_3000_PID" 2>/dev/null || true
        sleep 1
        log_success "Đã giải phóng port 3000"
    fi
fi

# Đảm bảo không còn process nào đang dùng port 3000
for i in {1..5}; do
    if command -v lsof &> /dev/null; then
        REMAINING_PID=$($SUDO_PREFIX lsof -ti :3000 2>/dev/null || echo "")
    else
        REMAINING_PID=""
    fi
    
    if [ -z "$REMAINING_PID" ]; then
        break
    fi
    
    log_warning "Vẫn còn process đang dùng port 3000, đang kill..."
    $SUDO_PREFIX kill -9 $REMAINING_PID 2>/dev/null || true
    sleep 1
done

# Validate .env values trước khi khởi động
log_info "Đang kiểm tra cấu hình .env..."
if [ -f .env ]; then
    # Kiểm tra RATE_LIMIT_WINDOW_MS
    RATE_LIMIT_WINDOW_MS=$(grep -E "^RATE_LIMIT_WINDOW_MS=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
    if [ -n "$RATE_LIMIT_WINDOW_MS" ]; then
        # Kiểm tra xem có phải số hợp lệ không
        if ! echo "$RATE_LIMIT_WINDOW_MS" | grep -qE '^[0-9]+$' || [ "$RATE_LIMIT_WINDOW_MS" -lt 1 ] || [ "$RATE_LIMIT_WINDOW_MS" -gt 2147483647 ] 2>/dev/null; then
            log_warning "RATE_LIMIT_WINDOW_MS trong .env có giá trị không hợp lệ: $RATE_LIMIT_WINDOW_MS"
            log_info "Đang sửa thành giá trị mặc định: 900000 (15 phút)"
            # Backup .env
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            # Sửa giá trị
            if grep -q "RATE_LIMIT_WINDOW_MS=" .env; then
                sed -i "s|RATE_LIMIT_WINDOW_MS=.*|RATE_LIMIT_WINDOW_MS=900000|" .env
            else
                echo "RATE_LIMIT_WINDOW_MS=900000" >> .env
            fi
            log_success "Đã sửa RATE_LIMIT_WINDOW_MS thành 900000"
        fi
    fi
    
    # Kiểm tra các rate limit window khác
    for VAR in "INCR_RATE_LIMIT_WINDOW_MS" "LOGIN_RATE_LIMIT_WINDOW_MS"; do
        VAL=$(grep -E "^${VAR}=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
        if [ -n "$VAL" ]; then
            if ! echo "$VAL" | grep -qE '^[0-9]+$' || [ "$VAL" -lt 1 ] || [ "$VAL" -gt 2147483647 ] 2>/dev/null; then
                log_warning "${VAR} trong .env có giá trị không hợp lệ: $VAL"
                DEFAULT_VAL="60000"
                if [ "$VAR" = "LOGIN_RATE_LIMIT_WINDOW_MS" ]; then
                    DEFAULT_VAL="900000"
                fi
                log_info "Đang sửa thành giá trị mặc định: $DEFAULT_VAL"
                if grep -q "${VAR}=" .env; then
                    sed -i "s|${VAR}=.*|${VAR}=${DEFAULT_VAL}|" .env
                else
                    echo "${VAR}=${DEFAULT_VAL}" >> .env
                fi
            fi
        fi
    done
fi

# Khởi động với PM2
log_info "Đang khởi động server với PM2..."
pm2 start ecosystem.config.js

# Lưu PM2 process list
pm2 save

# Cấu hình PM2 startup script
if ! pm2 startup | grep -q "already"; then
    log_info "Đang cấu hình PM2 startup..."
    if [[ $EUID -eq 0 ]]; then
        env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
    else
        $SUDO_PREFIX env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    fi
    pm2 save
fi

log_success "Server đã được khởi động với PM2!"

# ============================================
# BƯỚC 11: Hiển thị thông tin
# ============================================
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║              SETUP HOÀN TẤT!                      ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

log_info "📊 Trạng thái PM2:"
pm2 status

echo -e "\n${YELLOW}📝 Thông tin server:${NC}"
echo "Domain: $DOMAIN"
echo "API Base URL: $API_BASE_URL"
echo "Port: ${PORT:-3000}"

echo -e "\n${YELLOW}🔧 Các lệnh hữu ích:${NC}"
echo "Xem logs:           pm2 logs posed-server"
echo "Xem status:         pm2 status"
echo "Restart server:      pm2 restart posed-server"
echo "Stop server:        pm2 stop posed-server"
echo "Xem monitoring:     pm2 monit"

echo -e "\n${YELLOW}🔒 SSL Certificate:${NC}"
if [ -f "$CERT_PATH" ]; then
    echo "Certificate: $CERT_PATH"
    echo "Private Key: $KEY_PATH"
    echo "Renew certificate: $SUDO_PREFIX certbot renew"
else
    echo "Certificate chưa được cài đặt"
fi

echo -e "\n${YELLOW}🌐 Nginx Status:${NC}"
if $SUDO_PREFIX systemctl is-active --quiet nginx; then
    echo "Nginx: ✅ Đang chạy"
    echo "Config: $NGINX_CONFIG"
    echo "Logs: /var/log/nginx/posed-server-*.log"
    echo "Reload: $SUDO_PREFIX systemctl reload nginx"
else
    echo "Nginx: ❌ Không chạy"
    echo "Start: $SUDO_PREFIX systemctl start nginx"
fi

echo -e "\n${YELLOW}🔥 Firewall Status:${NC}"
$SUDO_PREFIX ufw status | head -n 5

echo -e "\n${GREEN}🎉 Server đã sẵn sàng và đang chạy!${NC}\n"

