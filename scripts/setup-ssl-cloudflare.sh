#!/bin/bash

# 🔒 Script hỗ trợ cấu hình SSL với Cloudflare DNS validation
# Sử dụng khi HTTP validation không hoạt động (domain chưa trỏ về server)

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
echo "║     Cloudflare SSL Setup với DNS Validation         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra certbot
if ! command -v certbot &> /dev/null; then
    log_error "Certbot chưa được cài đặt!"
    log_info "Cài đặt: sudo apt-get install certbot python3-certbot-dns-cloudflare"
    exit 1
fi

# Kiểm tra plugin Cloudflare
if ! certbot plugins | grep -q "dns-cloudflare"; then
    log_warning "Plugin Cloudflare DNS chưa được cài đặt"
    log_info "Đang cài đặt plugin..."
    sudo apt-get install -y python3-certbot-dns-cloudflare
fi

# Đọc domain từ .env
if [ ! -f .env ]; then
    log_error "File .env không tồn tại!"
    exit 1
fi

API_BASE_URL=$(grep -E "^API_BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
if [ -z "$API_BASE_URL" ]; then
    API_BASE_URL=$(grep -E "^BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
fi

if [ -z "$API_BASE_URL" ]; then
    log_error "Không tìm thấy API_BASE_URL hoặc BASE_URL trong .env"
    exit 1
fi

DOMAIN=$(echo "$API_BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
log_info "Domain: $DOMAIN"

# Kiểm tra Cloudflare API credentials
CLOUDFLARE_EMAIL=""
CLOUDFLARE_API_KEY=""

if [ -f "cloudflare.ini" ]; then
    log_info "Đã tìm thấy file cloudflare.ini"
else
    log_warning "Chưa có file cloudflare.ini"
    log_info "Tạo file cloudflare.ini với Cloudflare API credentials:"
    echo ""
    read -p "Cloudflare Email: " CLOUDFLARE_EMAIL
    read -sp "Cloudflare API Key (Global API Key): " CLOUDFLARE_API_KEY
    echo ""
    
    cat > cloudflare.ini << EOF
# Cloudflare API credentials
dns_cloudflare_email = $CLOUDFLARE_EMAIL
dns_cloudflare_api_key = $CLOUDFLARE_API_KEY
EOF
    
    chmod 600 cloudflare.ini
    log_success "Đã tạo file cloudflare.ini"
fi

# Yêu cầu certificate với DNS validation
log_info "Đang yêu cầu certificate với DNS validation..."
log_warning "LƯU Ý: Bạn cần có Cloudflare API credentials"

sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials cloudflare.ini \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@$DOMAIN" || {
    log_error "Không thể cài đặt certificate"
    log_info "Kiểm tra:"
    log_info "1. Cloudflare API credentials có đúng không?"
    log_info "2. Domain có được quản lý bởi Cloudflare không?"
    exit 1
}

log_success "Certificate đã được cài đặt thành công!"

# Cập nhật .env
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    log_info "Cập nhật .env với đường dẫn certificate..."
    
    # Backup .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Cập nhật SSL paths trong .env
    sed -i "s|USE_HTTPS=.*|USE_HTTPS=true|" .env
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=$KEY_PATH|" .env
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=$CERT_PATH|" .env
    sed -i "s|SSL_FULLCHAIN_PATH=.*|SSL_FULLCHAIN_PATH=$CERT_PATH|" .env
    
    log_success "Đã cập nhật .env với cấu hình SSL"
fi

echo -e "\n${GREEN}✅ Hoàn tất!${NC}"
echo "Certificate: $CERT_PATH"
echo "Private Key: $KEY_PATH"

