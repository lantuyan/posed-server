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
# Create temp file to capture output
OUTPUT_FILE=$(mktemp)

# Run ssh and tee output so user sees progress in real-time
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && bash -l scripts/backup.sh" | tee "$OUTPUT_FILE"

# Extract the backup file path from the output
# Looking for line: "Backup file: backups/backup_YYYYMMDD_HHMMSS.tar.gz"
REMOTE_BACKUP_FILE=$(grep "Backup file:" "$OUTPUT_FILE" | awk '{print $NF}' | tr -d '\r')

rm "$OUTPUT_FILE"

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

# Check file size
FILE_SIZE=$(ssh "$REMOTE_HOST" "du -h $FULL_REMOTE_PATH | cut -f1")
log_info "Remote file size: $FILE_SIZE"

if command -v rsync &> /dev/null; then
    log_info "Using rsync for download (resumable)..."
    rsync -avP -e ssh "$REMOTE_HOST:$FULL_REMOTE_PATH" "$LOCAL_BACKUP_DIR/$FILENAME"
else
    log_info "rsync not found, using scp..."
    scp "$REMOTE_HOST:$FULL_REMOTE_PATH" "$LOCAL_BACKUP_DIR/$FILENAME"
fi

if [ $? -eq 0 ]; then
    log_success "Backup downloaded successfully to: $LOCAL_BACKUP_DIR/$FILENAME"
    
    # 3. Clean up remote file
    log_info "Cleaning up remote backup file..."
    ssh "$REMOTE_HOST" "rm -f $FULL_REMOTE_PATH"
    log_success "Remote backup file removed."
else
    log_error "Failed to download backup file."
    exit 1
fi

log_success "Remote backup process completed!"
