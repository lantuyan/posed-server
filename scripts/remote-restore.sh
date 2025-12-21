#!/bin/bash

# ♻️ Pose Server - Remote Restore Script
# Runs on LOCAL machine. Uploads a backup file to remote server and triggers restore.

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

# Check arguments
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <user@hostname> <remote_project_path> <local_backup_file>"
    echo "Example: $0 root@123.45.67.89 /root/posed-server backups/backup_20251222_001355.tar.gz"
    exit 1
fi

REMOTE_HOST="$1"
REMOTE_PATH="$2"
LOCAL_BACKUP_FILE="$3"

if [ ! -f "$LOCAL_BACKUP_FILE" ]; then
    log_error "Local backup file not found: $LOCAL_BACKUP_FILE"
    exit 1
fi

FILENAME=$(basename "$LOCAL_BACKUP_FILE")

log_info "Starting remote restore..."
log_info "Remote Host: $REMOTE_HOST"
log_info "Remote Path: $REMOTE_PATH"
log_info "Backup File: $LOCAL_BACKUP_FILE"

# 1. Upload backup file
log_info "Uploading backup file to remote server..."
# Upload to /tmp first to avoid permission issues, or directly to project dir if user has access
# Let's upload to project dir/backups (create if needed) or just /tmp
# To be safe and simple, let's upload to the project root or /tmp. 
# The restore script takes a path.
REMOTE_TEMP_PATH="/tmp/$FILENAME"

scp "$LOCAL_BACKUP_FILE" "$REMOTE_HOST:$REMOTE_TEMP_PATH"

if [ $? -ne 0 ]; then
    log_error "Failed to upload backup file."
    exit 1
fi

log_success "Backup file uploaded to $REMOTE_TEMP_PATH"

# 2. Trigger restore on remote server
log_info "Connecting to remote server to trigger restore..."
log_warning "This will overwrite data on the remote server!"

# Run restore script
# We use 'bash -l' to ensure environment variables are loaded
# We pass the path to the uploaded file
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && bash -l scripts/restore.sh $REMOTE_TEMP_PATH"

if [ $? -eq 0 ]; then
    log_success "Remote restore completed successfully."
    
    # 3. Cleanup remote file
    log_info "Cleaning up remote backup file..."
    ssh "$REMOTE_HOST" "rm -f $REMOTE_TEMP_PATH"
    log_success "Remote temporary file removed."
else
    log_error "Remote restore failed."
    exit 1
fi

log_success "Remote restore process completed!"
