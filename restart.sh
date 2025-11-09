#!/bin/bash

# 🔄 Pose Server - Restart Script
# Script để restart server đang chạy trên PM2
# Xử lý port bị chiếm và process duplicate
# Sử dụng: ./restart.sh

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
echo "║          Pose Server - Restart Script               ║"
echo "║         Restart server đang chạy trên PM2          ║"
echo "║    Xử lý port bị chiếm và process duplicate        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra quyền root và thiết lập SUDO prefix
if [[ $EUID -eq 0 ]]; then
    SUDO_PREFIX=""
else
    SUDO_PREFIX="sudo"
fi

# ============================================
# BƯỚC 1: Kiểm tra PM2
# ============================================
log_step "Bước 1: Kiểm tra PM2..."

if ! command -v pm2 &> /dev/null; then
    log_error "PM2 chưa được cài đặt!"
    log_info "Vui lòng chạy ./start.sh để cài đặt PM2 và khởi động server"
    exit 1
fi
log_success "PM2 $(pm2 -v) đã có sẵn"

# ============================================
# BƯỚC 2: Lấy thông tin port từ config
# ============================================
log_step "Bước 2: Lấy thông tin port từ config..."

PORT=3000  # Default port

# Đọc port từ .env
if [ -f ".env" ]; then
    ENV_PORT=$(grep -E "^PORT=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
    if [ -n "$ENV_PORT" ] && [ "$ENV_PORT" != "" ]; then
        PORT=$ENV_PORT
    fi
fi

# Đọc port từ ecosystem.config.js nếu không có trong .env
if [ "$PORT" = "3000" ] && [ -f "ecosystem.config.js" ]; then
    ECS_PORT=$(grep -E "PORT:\s*[0-9]+" ecosystem.config.js 2>/dev/null | head -1 | grep -oE "[0-9]+" || echo "")
    if [ -n "$ECS_PORT" ] && [ "$ECS_PORT" != "" ]; then
        PORT=$ECS_PORT
    fi
fi

log_info "Port server: $PORT"

# ============================================
# BƯỚC 3: Xóa tất cả process duplicate trong PM2
# ============================================
log_step "Bước 3: Xóa tất cả process duplicate..."

# Đếm số lượng process có tên posed-server
PM2_COUNT=$(pm2 list | grep -c "posed-server" || echo "0")

if [ "$PM2_COUNT" -gt 0 ]; then
    log_warning "Phát hiện $PM2_COUNT process(es) 'posed-server' đang chạy"
    log_info "Đang xóa tất cả process cũ để tránh duplicate..."
    
    # Xóa tất cả process có tên posed-server (kể cả stopped/errored)
    pm2 delete posed-server 2>/dev/null || true
    
    # Đợi một chút để PM2 cleanup
    sleep 1
    
    log_success "Đã xóa tất cả process duplicate"
else
    log_info "Không có process 'posed-server' nào đang chạy"
fi

# ============================================
# BƯỚC 4: Kiểm tra và kill process đang chiếm port
# ============================================
log_step "Bước 4: Kiểm tra port $PORT có bị chiếm không..."

PORT_PIDS=()

# Tìm process đang dùng port (trừ PM2 và node processes được quản lý bởi PM2)
if command -v lsof &> /dev/null; then
    # Lấy tất cả PID đang dùng port
    ALL_PIDS=($($SUDO_PREFIX lsof -ti :$PORT 2>/dev/null || echo ""))
    
    for pid in "${ALL_PIDS[@]}"; do
        if [ -n "$pid" ]; then
            # Kiểm tra xem process có phải là PM2 process không
            PROCESS_NAME=$($SUDO_PREFIX ps -p "$pid" -o comm= 2>/dev/null || echo "")
            PROCESS_CMD=$($SUDO_PREFIX ps -p "$pid" -o args= 2>/dev/null || echo "")
            
            # Bỏ qua nếu là PM2 daemon hoặc PM2 process
            if [[ ! "$PROCESS_CMD" =~ "PM2" ]] && [[ ! "$PROCESS_NAME" =~ "PM2" ]]; then
                PORT_PIDS+=("$pid")
            fi
        fi
    done
elif command -v fuser &> /dev/null; then
    # Fallback: dùng fuser
    PORT_PIDS=($($SUDO_PREFIX fuser $PORT/tcp 2>/dev/null | awk '{print $1}' || echo ""))
fi

if [ ${#PORT_PIDS[@]} -gt 0 ]; then
    log_warning "Phát hiện ${#PORT_PIDS[@]} process(es) đang chiếm port $PORT"
    
    for pid in "${PORT_PIDS[@]}"; do
        if [ -n "$pid" ]; then
            PROCESS_NAME=$($SUDO_PREFIX ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            PROCESS_CMD=$($SUDO_PREFIX ps -p "$pid" -o args= 2>/dev/null | head -c 80 || echo "")
            log_info "Killing process: $PROCESS_NAME (PID: $pid) - $PROCESS_CMD"
            $SUDO_PREFIX kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    sleep 1
    log_success "Đã kill tất cả process đang chiếm port $PORT"
else
    log_success "Port $PORT không bị chiếm"
fi

# ============================================
# BƯỚC 5: Kiểm tra file config và khởi động lại
# ============================================
log_step "Bước 5: Khởi động lại server..."

# Kiểm tra file ecosystem.config.js
if [ ! -f "ecosystem.config.js" ]; then
    log_error "File ecosystem.config.js không tồn tại!"
    log_info "Vui lòng chạy ./start.sh để cấu hình và khởi động server"
    exit 1
fi

# Khởi động server với PM2
log_info "Đang khởi động server với PM2..."
pm2 start ecosystem.config.js

# Lưu PM2 process list
pm2 save

# Đợi một chút để server khởi động
sleep 2

log_success "Server đã được khởi động lại!"

# ============================================
# BƯỚC 6: Hiển thị thông tin
# ============================================
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║              RESTART HOÀN TẤT!                  ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

log_info "📊 Trạng thái PM2:"
pm2 status

echo -e "\n${YELLOW}📝 Thông tin server:${NC}"
pm2 describe posed-server | grep -E "(status|uptime|restarts|memory|cpu)" || true

echo -e "\n${YELLOW}🔧 Các lệnh hữu ích:${NC}"
echo "Xem logs:           pm2 logs posed-server"
echo "Xem logs realtime:  pm2 logs posed-server --lines 50"
echo "Xem status:         pm2 status"
echo "Stop server:        pm2 stop posed-server"
echo "Xem monitoring:     pm2 monit"

echo -e "\n${GREEN}🎉 Server đã được restart thành công!${NC}\n"

