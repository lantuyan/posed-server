#!/bin/bash

# 🛡️ Pose Server - Backup Script
# Backups database, configuration, certificates, and uploads

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

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

log_info "Starting backup process..."
log_info "Project Root: $PROJECT_ROOT"
log_info "Backup Directory: $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Backup Database
log_info "Backing up MongoDB..."
DB_NAME="posed-server"
if [ -n "$MONGODB_URI" ]; then
    # Extract DB name from URI if possible, otherwise use default
    EXTRACTED_NAME=$(echo "$MONGODB_URI" | sed -n 's|.*/\([^/?]*\).*|\1|p')
    if [ -n "$EXTRACTED_NAME" ]; then
        DB_NAME="$EXTRACTED_NAME"
    fi
fi

if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongo_dump"
    log_success "Database '$DB_NAME' backed up."
else
    log_warning "mongodump not found! Skipping database backup."
fi

# 2. Backup Configuration
log_info "Backing up configuration..."
cp .env "$BACKUP_DIR/.env"
if [ -f ecosystem.config.js ]; then
    cp ecosystem.config.js "$BACKUP_DIR/"
fi
log_success "Configuration backed up."

# 3. Backup Certificates
log_info "Backing up certificates..."
if [ -d "certs" ]; then
    cp -r certs "$BACKUP_DIR/"
    log_success "Certificates directory backed up."
else
    log_warning "certs directory not found. Skipping."
fi

# 4. Backup Uploads
log_info "Backing up uploads..."
if [ -d "uploads" ]; then
    # Use rsync for better performance with many files, fallback to cp
    if command -v rsync &> /dev/null; then
        rsync -av --progress uploads "$BACKUP_DIR/" > /dev/null
    else
        cp -r uploads "$BACKUP_DIR/"
    fi
    log_success "Uploads directory backed up."
else
    log_warning "uploads directory not found. Skipping."
fi

# 5. Create Archive
log_info "Creating archive..."
mkdir -p backups
tar -czf "backups/$ARCHIVE_NAME" -C "backups" "backup_${TIMESTAMP}"

# 6. Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$BACKUP_DIR"

log_success "Backup completed successfully!"
log_success "Backup file: backups/$ARCHIVE_NAME"
