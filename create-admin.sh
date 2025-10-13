#!/bin/bash

# 👑 Pose Server - Create Admin User Script
# Script đơn giản để tạo admin user với thông tin tùy chỉnh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo -e "${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║        Create Admin User            ║"
echo "║     Tạo tài khoản Admin             ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra file .env
if [[ ! -f ".env" ]]; then
    log_warning "Không tìm thấy file .env!"
    log_info "Vui lòng tạo file .env trước khi tạo admin user"
    exit 1
fi

# Hàm nhập thông tin admin
prompt_admin_info() {
    echo -e "\n${YELLOW}🔧 Nhập thông tin Admin User:${NC}"
    
    # Admin username
    read -p "Username [admin]: " admin_username
    admin_username=${admin_username:-admin}
    
    # Admin password
    read -s -p "Password [admin123]: " admin_password
    echo
    admin_password=${admin_password:-admin123}
    
    # Admin role
    read -p "Role [admin]: " admin_role
    admin_role=${admin_role:-admin}
    
    echo -e "\n${GREEN}✅ Thông tin Admin:${NC}"
    echo "Username: $admin_username"
    echo "Password: [HIDDEN]"
    echo "Role: $admin_role"
    
    read -p "Tạo admin user với thông tin này? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Hủy tạo admin user."
        exit 0
    fi
}

# Kiểm tra arguments
if [[ $# -eq 0 ]]; then
    # Không có arguments, hỏi thông tin
    prompt_admin_info
else
    # Có arguments, sử dụng trực tiếp
    admin_username=$1
    admin_password=$2
    admin_role=${3:-admin}
    
    log_info "Tạo admin user với thông tin từ command line"
fi

# Tạo admin user
log_info "👑 Tạo admin user..."
node scripts/setup-admin.js "$admin_username" "$admin_password" "$admin_role"

log_success "Admin user đã được tạo thành công!"
echo -e "\n${YELLOW}📝 Thông tin đăng nhập:${NC}"
echo "Username: $admin_username"
echo "Password: $admin_password"
echo "Role: $admin_role"

echo -e "\n${YELLOW}🔗 API Login:${NC}"
echo "POST /api/admin/login"
echo "Body: {\"username\": \"$admin_username\", \"password\": \"$admin_password\"}"
