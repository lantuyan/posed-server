#!/bin/bash

# 🔄 Reset SSL Pinning Script
# Script này sẽ:
# 1. Xóa certificates hiện tại
# 2. Tạo Self-Signed Certificate mới (thời hạn 10 năm)
# 3. Extract Pin Hash mới
# 4. Cập nhật file .env

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
echo "╔══════════════════════════════════════════════════════╗"
echo "║           Reset SSL Pinning Configuration            ║"
echo "║    Tạo Self-Signed Certificate mới (10 năm)         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load .env to get domain
if [ -f .env ]; then
    API_BASE_URL=$(grep -E "^API_BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
    if [ -z "$API_BASE_URL" ]; then
        API_BASE_URL=$(grep -E "^BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
    fi
fi

if [ -z "$API_BASE_URL" ]; then
    read -p "Nhập domain của server (VD: pose.sixpilot.technology): " DOMAIN
else
    DOMAIN=$(echo "$API_BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
    read -p "Domain hiện tại là $DOMAIN. Nhấn Enter để giữ nguyên hoặc nhập domain mới: " INPUT_DOMAIN
    if [ -n "$INPUT_DOMAIN" ]; then
        DOMAIN="$INPUT_DOMAIN"
    fi
fi

log_info "Domain sử dụng: $DOMAIN"

# Confirm reset
echo -e "${RED}⚠️  CẢNH BÁO: Hành động này sẽ xóa certificates hiện tại và tạo mới!${NC}"
echo -e "${RED}⚠️  App mobile sẽ KHÔNG THỂ kết nối cho đến khi được cập nhật Pin Hash mới!${NC}"
read -p "Bạn có chắc chắn muốn tiếp tục? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Đã hủy bỏ."
    exit 0
fi

# 1. Backup & Remove old certs
log_info "1. Dọn dẹp certificates cũ..."
mkdir -p certs
if [ -f "certs/server.crt" ] || [ -f "certs/server.key" ]; then
    BACKUP_DIR="certs/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    mv certs/* "$BACKUP_DIR" 2>/dev/null || true
    log_success "Đã backup certificates cũ vào $BACKUP_DIR"
else
    log_info "Không tìm thấy certificates cũ trong thư mục certs/"
fi

# 2. Generate new Self-Signed Certificate (10 years)
log_info "2. Tạo Self-Signed Certificate mới (10 năm)..."

# Create private key
openssl genrsa -out certs/server.key 2048

# Create CSR
openssl req -new -key certs/server.key -out certs/server.csr -subj "/C=VN/ST=Hanoi/L=Hanoi/O=Posed/OU=Server/CN=$DOMAIN"

# Create Certificate (Valid for 3650 days = 10 years)
openssl x509 -req -days 3650 -in certs/server.csr -signkey certs/server.key -out certs/server.crt

# Create fullchain (same as cert for self-signed)
cat certs/server.crt > certs/fullchain.pem

log_success "Đã tạo certificate mới thành công (hết hạn sau 10 năm)"

# 3. Extract Pin Hash
log_info "3. Extract Pin Hash mới..."
npm run extract-pin certs/server.crt

# 4. Update .env
log_info "4. Cập nhật file .env..."

CERT_PATH="$(pwd)/certs/server.crt"
KEY_PATH="$(pwd)/certs/server.key"

# Update SSL paths
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

# Update Pin Hash in .env
PIN_HASH_FILE="certs/pin-hash.txt"
if [ -f "$PIN_HASH_FILE" ]; then
    PIN_HASH=$(cat "$PIN_HASH_FILE")
    if grep -q "SSL_PIN_HASH=" .env; then
        sed -i "s|SSL_PIN_HASH=.*|SSL_PIN_HASH=$PIN_HASH|" .env
    else
        echo "SSL_PIN_HASH=$PIN_HASH" >> .env
    fi
    log_success "Đã cập nhật SSL_PIN_HASH trong .env"
fi

# Enable HTTPS in .env (since we are using self-signed, likely for dev/direct access)
# But if using Nginx, we might want USE_HTTPS=false.
# However, for self-signed, usually we might run directly or configure Nginx to use these certs.
# Let's ask user or default to true for direct access testing.
if grep -q "USE_HTTPS=" .env; then
    sed -i "s|USE_HTTPS=.*|USE_HTTPS=true|" .env
else
    echo "USE_HTTPS=true" >> .env
fi
log_info "Đã set USE_HTTPS=true trong .env"

log_success "✅ Hoàn tất reset SSL Pinning!"
log_info "Vui lòng restart server để áp dụng thay đổi: ./restart.sh"
