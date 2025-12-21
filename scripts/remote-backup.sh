#!/bin/bash

# 🛡️ Pose Server - Remote Backup Script
# Runs on LOCAL machine. Connects to remote server, triggers backup, and downloads the file.

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
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <user@hostname> <remote_project_path>"
    echo "Example: $0 root@123.45.67.89 /root/posed-server"
    exit 1
fi

REMOTE_HOST="$1"
REMOTE_PATH="$2"

# Get project root directory (local)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_BACKUP_DIR="$PROJECT_ROOT/backups"

# Create local backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

log_info "Starting remote backup..."
log_info "Remote Host: $REMOTE_HOST"
log_info "Remote Path: $REMOTE_PATH"
log_info "Local Backup Dir: $LOCAL_BACKUP_DIR"

# 1. Trigger backup on remote server
log_info "Connecting to remote server to trigger backup..."
# We run the backup script and capture the output to find the filename
# We use 'bash -l' to ensure environment variables are loaded if needed
BACKUP_OUTPUT=$(ssh "$REMOTE_HOST" "cd $REMOTE_PATH && bash -l scripts/backup.sh")

echo "$BACKUP_OUTPUT"

# Extract the backup file path from the output
# Looking for line: "Backup file: backups/backup_YYYYMMDD_HHMMSS.tar.gz"
REMOTE_BACKUP_FILE=$(echo "$BACKUP_OUTPUT" | grep "Backup file:" | awk '{print $NF}' | tr -d '\r')

if [ -z "$REMOTE_BACKUP_FILE" ]; then
    log_error "Could not determine backup filename from remote output."
    exit 1
fi

log_success "Remote backup created: $REMOTE_BACKUP_FILE"

# 2. Download backup file
log_info "Downloading backup file..."
# Construct full remote path
FULL_REMOTE_PATH="$REMOTE_PATH/$REMOTE_BACKUP_FILE"
FILENAME=$(basename "$REMOTE_BACKUP_FILE")

scp "$REMOTE_HOST:$FULL_REMOTE_PATH" "$LOCAL_BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    log_success "Backup downloaded successfully to: $LOCAL_BACKUP_DIR/$FILENAME"
    
    # 3. Clean up remote file (Optional - ask user or just do it? Plan said optional. Let's keep it but maybe prompt or just do it to save space)
    # For automation, it's better to just do it or have a flag. Let's just do it to keep server clean.
    log_info "Cleaning up remote backup file..."
    ssh "$REMOTE_HOST" "rm -f $FULL_REMOTE_PATH"
    log_success "Remote backup file removed."
else
    log_error "Failed to download backup file."
    exit 1
fi

log_success "Remote backup process completed!"
