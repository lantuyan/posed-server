#!/bin/bash

# 🛠️ Pose Server - Server Environment Setup Script
# Script này chỉ cài đặt môi trường cần thiết trên server Linux
# Sau khi chạy xong, bạn có thể pull code từ git và chạy npm start

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║     Pose Server Environment Setup   ║"
echo "║    Cài đặt môi trường server Linux  ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra quyền root
if [[ $EUID -eq 0 ]]; then
    log_error "Không nên chạy script này với quyền root!"
    log_info "Hãy chạy với user thường có sudo privileges"
    exit 1
fi

# Cập nhật hệ thống
log_info "📦 Cập nhật hệ thống..."
sudo apt update -qq && sudo apt upgrade -y -qq

# Cài đặt dependencies cơ bản
log_info "🔧 Cài đặt dependencies cơ bản..."
sudo apt install -y -qq curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Cài đặt Node.js 20
log_info "📦 Cài đặt Node.js..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y -qq nodejs
    log_success "Node.js $(node -v) đã được cài đặt"
else
    log_info "Node.js $(node -v) đã có sẵn"
fi

# Cài đặt npm (đảm bảo có npm)
if ! command -v npm &> /dev/null; then
    log_info "📦 Cài đặt npm..."
    sudo apt install -y -qq npm
    log_success "npm đã được cài đặt"
else
    log_info "npm $(npm -v) đã có sẵn"
fi

# Cài đặt MongoDB
log_info "🗄️  Cài đặt MongoDB..."
if ! command -v mongod &> /dev/null; then
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add - > /dev/null 2>&1
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    sudo apt update -qq
    sudo apt install -y -qq mongodb-org
    sudo systemctl enable mongod > /dev/null 2>&1
    sudo systemctl start mongod > /dev/null 2>&1
    log_success "MongoDB đã được cài đặt và khởi động"
else
    log_info "MongoDB đã có sẵn"
fi

# Cài đặt PM2
log_info "⚡ Cài đặt PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2 > /dev/null 2>&1
    log_success "PM2 đã được cài đặt"
else
    log_info "PM2 $(pm2 -v) đã có sẵn"
fi

# Cài đặt Nginx (optional)
log_info "🌐 Cài đặt Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y -qq nginx
    sudo systemctl enable nginx > /dev/null 2>&1
    sudo systemctl start nginx > /dev/null 2>&1
    log_success "Nginx đã được cài đặt"
else
    log_info "Nginx đã có sẵn"
fi

# Cài đặt UFW Firewall
log_info "🔥 Cài đặt và cấu hình firewall..."
if ! command -v ufw &> /dev/null; then
    sudo apt install -y -qq ufw
fi

# Cấu hình firewall cơ bản
sudo ufw allow ssh > /dev/null 2>&1
sudo ufw allow 80/tcp > /dev/null 2>&1
sudo ufw allow 443/tcp > /dev/null 2>&1
sudo ufw allow 3000/tcp > /dev/null 2>&1
sudo ufw --force enable > /dev/null 2>&1

# Cài đặt Git (đảm bảo có git)
if ! command -v git &> /dev/null; then
    log_info "📋 Cài đặt Git..."
    sudo apt install -y -qq git
    log_success "Git đã được cài đặt"
else
    log_info "Git $(git --version | cut -d' ' -f3) đã có sẵn"
fi

# Kiểm tra trạng thái services
log_info "📊 Kiểm tra trạng thái services..."
MONGODB_STATUS=$(sudo systemctl is-active mongod)
NGINX_STATUS=$(sudo systemctl is-active nginx)

echo -e "\n${GREEN}╔══════════════════════════════════════╗"
echo -e "║         SETUP HOÀN TẤT!               ║"
echo -e "╚══════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}📊 Trạng thái Services:${NC}"
echo "MongoDB: $MONGODB_STATUS"
echo "Nginx: $NGINX_STATUS"

echo -e "\n${YELLOW}🛠️  Các tools đã cài đặt:${NC}"
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo "Git: $(git --version | cut -d' ' -f3)"
echo "PM2: $(pm2 -v)"
echo "MongoDB: $(mongod --version | head -n1 | cut -d' ' -f3)"

echo -e "\n${YELLOW}📝 Bước tiếp theo:${NC}"
echo "1. Clone/pull code từ git repository"
echo "2. Chạy: npm install"
echo "3. Tạo file .env với cấu hình cần thiết"
echo "4. Chạy: npm run setup:admin (để tạo admin user)"
echo "5. Chạy: npm start (hoặc pm2 start server.js)"

echo -e "\n${YELLOW}🔧 Lệnh hữu ích:${NC}"
echo "Kiểm tra MongoDB: sudo systemctl status mongod"
echo "Kiểm tra Nginx: sudo systemctl status nginx"
echo "Khởi động PM2: pm2 start server.js"
echo "Xem logs PM2: pm2 logs"

echo -e "\n${GREEN}🎉 Môi trường server đã sẵn sàng!${NC}"
echo -e "${BLUE}Bây giờ bạn có thể pull code và chạy ứng dụng.${NC}"
