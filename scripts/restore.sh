#!/bin/bash

# ♻️ Pose Server - Restore Script
# Restores database, configuration, certificates, and uploads from a backup file

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

# Check argument
if [ -z "$1" ]; then
    log_error "Usage: $0 <path_to_backup_tar_gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log_info "Starting restore process..."
log_info "Project Root: $PROJECT_ROOT"
log_info "Backup File: $BACKUP_FILE"

# Create temporary directory for extraction
TEMP_DIR="restore_temp_$(date +%s)"
mkdir -p "$TEMP_DIR"

# Extract archive
log_info "Extracting archive..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted folder (it might be inside the temp dir with a name like backup_TIMESTAMP)
EXTRACTED_FOLDER=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "backup_*" | head -n 1)

if [ -z "$EXTRACTED_FOLDER" ]; then
    log_error "Invalid backup structure. Could not find backup folder inside archive."
    rm -rf "$TEMP_DIR"
    exit 1
fi

log_info "Restoring from: $EXTRACTED_FOLDER"

# 1. Restore Configuration
log_info "Restoring configuration..."
if [ -f "$EXTRACTED_FOLDER/.env" ]; then
    if [ -f ".env" ]; then
        log_warning "Existing .env found. Backing it up to .env.bak"
        cp .env .env.bak
    fi
    cp "$EXTRACTED_FOLDER/.env" .env
    log_success ".env restored."
else
    log_warning ".env not found in backup."
fi

if [ -f "$EXTRACTED_FOLDER/ecosystem.config.js" ]; then
    cp "$EXTRACTED_FOLDER/ecosystem.config.js" .
    log_success "ecosystem.config.js restored."
fi

# 2. Restore Certificates
log_info "Restoring certificates..."
if [ -d "$EXTRACTED_FOLDER/certs" ]; then
    mkdir -p certs
    cp -r "$EXTRACTED_FOLDER/certs/"* certs/
    log_success "Certificates restored."
else
    log_warning "certs directory not found in backup."
fi

# 3. Restore Uploads
log_info "Restoring uploads..."
if [ -d "$EXTRACTED_FOLDER/uploads" ]; then
    mkdir -p uploads
    if command -v rsync &> /dev/null; then
        rsync -av "$EXTRACTED_FOLDER/uploads/" uploads/ > /dev/null
    else
        cp -r "$EXTRACTED_FOLDER/uploads/"* uploads/
    fi
    log_success "Uploads restored."
else
    log_warning "uploads directory not found in backup."
fi

# 4. Restore Database
log_info "Restoring MongoDB..."
if [ -d "$EXTRACTED_FOLDER/mongo_dump" ]; then
    # Load .env to get URI
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -n "$MONGODB_URI" ]; then
        if command -v mongorestore &> /dev/null; then
            mongorestore --uri="$MONGODB_URI" --drop "$EXTRACTED_FOLDER/mongo_dump"
            log_success "Database restored."
        else
            log_warning "mongorestore not found! Skipping database restore."
        fi
    else
        log_error "MONGODB_URI not found in .env. Cannot restore database."
    fi
else
    log_warning "mongo_dump directory not found in backup."
fi

# 5. Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

log_success "Restore completed successfully!"
log_info "You may need to restart the server for changes to take effect."
