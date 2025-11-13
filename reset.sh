#!/bin/bash

# ♻️ Pose Server - Reset Script
# Xóa toàn bộ dữ liệu trong database và restart lại server
# Sử dụng: ./reset.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

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
echo "║             Pose Server - Reset Script              ║"
echo "║     Xóa database và restart server bằng 1 lệnh     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra quyền root và thiết lập SUDO prefix
if [[ $EUID -eq 0 ]]; then
    SUDO_PREFIX=""
else
    SUDO_PREFIX="sudo"
fi

# ============================================
# BƯỚC 1: Kiểm tra file .env và lấy MONGODB_URI
# ============================================
log_step "Bước 1: Kiểm tra file .env và MONGODB_URI..."

if [[ ! -f ".env" ]]; then
    log_error "Không tìm thấy file .env!"
    log_info "Vui lòng tạo file .env trước khi chạy reset."
    exit 1
fi

MONGODB_URI=$(grep -E "^MONGODB_URI=" .env 2>/dev/null | tail -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")

if [[ -z "$MONGODB_URI" ]]; then
    log_warning "Không tìm thấy cấu hình MONGODB_URI trong .env, sử dụng mặc định mongodb://localhost:27017/posed-server"
    MONGODB_URI="mongodb://localhost:27017/posed-server"
fi

log_info "MONGODB_URI: $MONGODB_URI"

# ============================================
# BƯỚC 2: Xác định tên database
# ============================================
log_step "Bước 2: Xác định tên database..."

MONGO_CLIENT=""
if command -v mongosh &> /dev/null; then
    MONGO_CLIENT="mongosh"
elif command -v mongo &> /dev/null; then
    MONGO_CLIENT="mongo"
else
    log_error "Không tìm thấy mongosh hoặc mongo CLI. Vui lòng cài đặt MongoDB Shell."
    exit 1
fi

DETECTED_DB_NAME=$($MONGO_CLIENT "$MONGODB_URI" --quiet --eval "db.getName()" 2>/dev/null | tail -n1 | tr -d '"' | xargs || echo "")

# Fallback nếu không xác định được qua CLI
if [[ -z "$DETECTED_DB_NAME" ]]; then
    URI_NO_PARAMS="${MONGODB_URI%%\?*}"
    DB_CANDIDATE="${URI_NO_PARAMS##*/}"
    if [[ -z "$DB_CANDIDATE" || "$DB_CANDIDATE" == *":"* || "$DB_CANDIDATE" == *","* ]]; then
        DETECTED_DB_NAME="posed-server"
    else
        DETECTED_DB_NAME="$DB_CANDIDATE"
    fi
fi

if [[ -z "$DETECTED_DB_NAME" ]]; then
    log_error "Không thể xác định tên database từ MONGODB_URI."
    exit 1
fi

log_info "Database cần xóa: $DETECTED_DB_NAME"

# ============================================
# BƯỚC 3: Xác nhận với người dùng
# ============================================
log_step "Bước 3: Xác nhận thao tác nguy hiểm..."

echo -e "${YELLOW}⚠️  CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu trong database '$DETECTED_DB_NAME'.${NC}"
read -p "Nhập 'reset' để xác nhận: " confirm

if [[ "$confirm" != "reset" ]]; then
    log_warning "Hủy thao tác reset."
    exit 0
fi

# ============================================
# BƯỚC 4: Xóa database
# ============================================
log_step "Bước 4: Xóa toàn bộ dữ liệu trong database..."

$MONGO_CLIENT "$MONGODB_URI" --quiet --eval "db.dropDatabase()" >/dev/null

log_success "Đã xóa toàn bộ dữ liệu trong database '$DETECTED_DB_NAME'."

# ============================================
# BƯỚC 5: Restart server
# ============================================
log_step "Bước 5: Restart server..."

if [[ ! -x "./restart.sh" ]]; then
    log_warning "restart.sh chưa có quyền thực thi, đang cấp quyền..."
    $SUDO_PREFIX chmod +x ./restart.sh
fi

./restart.sh

echo -e "\n${GREEN}🎉 Reset hoàn tất! Database đã được xóa và server đã restart.${NC}\n"

