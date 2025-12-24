#!/bin/bash

# 🛡️ Pose Server - Backup Script
# Backups database, configuration, certificates, and all uploads/images

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env
if [ -f .env ]; then
    source .env
else
    log_error ".env file not found!"
    exit 1
fi

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/backup_${TIMESTAMP}"
ARCHIVE_NAME="backup_${TIMESTAMP}.tar.gz"

log_header "🛡️ Pose Server - Full Backup"
log_info "Project Root: $PROJECT_ROOT"
log_info "Backup Directory: $BACKUP_DIR"
log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =====================================================
# 1. Backup Database
# =====================================================
log_header "📦 Backing up MongoDB Database"
DB_NAME="posed-server"
if [ -n "$MONGODB_URI" ]; then
    # Extract DB name from URI if possible, otherwise use default
    EXTRACTED_NAME=$(echo "$MONGODB_URI" | sed -n 's|.*/\([^/?]*\).*|\1|p')
    if [ -n "$EXTRACTED_NAME" ]; then
        DB_NAME="$EXTRACTED_NAME"
    fi
fi

if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongo_dump" 2>&1 | tail -5
    MONGO_SIZE=$(du -sh "$BACKUP_DIR/mongo_dump" 2>/dev/null | cut -f1)
    log_success "Database '$DB_NAME' backed up. Size: $MONGO_SIZE"
else
    log_warning "mongodump not found! Skipping database backup."
    log_warning "Install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
fi

# =====================================================
# 2. Backup Configuration Files
# =====================================================
log_header "⚙️ Backing up Configuration Files"

mkdir -p "$BACKUP_DIR/config"

# .env file
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/config/.env"
    log_success ".env backed up"
fi

# PM2 ecosystem config
if [ -f ecosystem.config.js ]; then
    cp ecosystem.config.js "$BACKUP_DIR/config/"
    log_success "ecosystem.config.js backed up"
fi

# package.json and package-lock.json
if [ -f package.json ]; then
    cp package.json "$BACKUP_DIR/config/"
    log_success "package.json backed up"
fi

if [ -f package-lock.json ]; then
    cp package-lock.json "$BACKUP_DIR/config/"
    log_success "package-lock.json backed up"
fi

log_success "All configuration files backed up."

# =====================================================
# 3. Backup Certificates
# =====================================================
log_header "🔐 Backing up Certificates"
if [ -d "certs" ] && [ "$(ls -A certs 2>/dev/null)" ]; then
    cp -r certs "$BACKUP_DIR/"
    CERTS_COUNT=$(find "$BACKUP_DIR/certs" -type f | wc -l | tr -d ' ')
    CERTS_SIZE=$(du -sh "$BACKUP_DIR/certs" 2>/dev/null | cut -f1)
    log_success "Certificates backed up: $CERTS_COUNT files, Size: $CERTS_SIZE"
else
    log_warning "certs directory not found or empty. Skipping."
fi

# =====================================================
# 4. Backup All Uploads (Images and User Submissions)
# =====================================================
log_header "🖼️ Backing up Uploads (Images & Files)"
if [ -d "uploads" ]; then
    # Count files before backup
    TOTAL_FILES=$(find uploads -type f 2>/dev/null | wc -l | tr -d ' ')
    UPLOADS_SIZE=$(du -sh uploads 2>/dev/null | cut -f1)
    
    log_info "Found $TOTAL_FILES files in uploads/ (Size: $UPLOADS_SIZE)"
    log_info "This may take a while for large uploads..."
    
    # Use rsync for better performance with many files, fallback to cp
    if command -v rsync &> /dev/null; then
        rsync -a --info=progress2 uploads "$BACKUP_DIR/"
    else
        cp -r uploads "$BACKUP_DIR/"
    fi
    
    log_success "Uploads directory backed up: $TOTAL_FILES files"
else
    log_warning "uploads directory not found. Skipping."
fi

# =====================================================
# 5. Backup Source Code (optional but useful for versioning)
# =====================================================
log_header "📁 Backing up Source Code"
if [ -d "src" ]; then
    cp -r src "$BACKUP_DIR/"
    SRC_SIZE=$(du -sh "$BACKUP_DIR/src" 2>/dev/null | cut -f1)
    log_success "Source code backed up. Size: $SRC_SIZE"
fi

# Copy other important files
if [ -f "server.js" ]; then
    cp server.js "$BACKUP_DIR/"
    log_success "server.js backed up"
fi

# =====================================================
# 6. Create Archive
# =====================================================
log_header "📦 Creating Compressed Archive"

# Calculate uncompressed size
UNCOMPRESSED_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log_info "Uncompressed backup size: $UNCOMPRESSED_SIZE"

log_info "Compressing backup (this may take a while)..."
mkdir -p backups
tar -czf "backups/$ARCHIVE_NAME" -C "backups" "backup_${TIMESTAMP}"

# Get compressed size
COMPRESSED_SIZE=$(du -sh "backups/$ARCHIVE_NAME" 2>/dev/null | cut -f1)

# =====================================================
# 7. Cleanup
# =====================================================
log_info "Cleaning up temporary files..."
rm -rf "$BACKUP_DIR"

# =====================================================
# Summary
# =====================================================
log_header "✅ Backup Completed Successfully!"
echo -e "📁 Backup file: ${GREEN}backups/$ARCHIVE_NAME${NC}"
echo -e "📊 Compressed size: ${GREEN}$COMPRESSED_SIZE${NC} (from $UNCOMPRESSED_SIZE)"
echo -e "📅 Created at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
log_info "To restore, run: ./scripts/restore.sh backups/$ARCHIVE_NAME"
