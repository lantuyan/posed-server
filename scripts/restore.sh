#!/bin/bash

# ♻️ Pose Server - Restore Script
# Restores database, configuration, certificates, and uploads from a backup file
# With interactive options to choose what to restore

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# Function to ask yes/no question
ask_yes_no() {
    local prompt="$1"
    local default="${2:-y}"
    
    if [ "$default" = "y" ]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi
    
    while true; do
        read -p "$prompt" answer
        answer=${answer:-$default}
        case ${answer:0:1} in
            y|Y) return 0 ;;
            n|N) return 1 ;;
            *) echo "Please answer yes or no." ;;
        esac
    done
}

# Check argument
if [ -z "$1" ]; then
    log_error "Usage: $0 <path_to_backup_tar_gz> [--all]"
    echo ""
    echo "Options:"
    echo "  --all    Restore everything without asking"
    echo ""
    echo "Example:"
    echo "  $0 backups/backup_20251224_120000.tar.gz"
    echo "  $0 backups/backup_20251224_120000.tar.gz --all"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_ALL=false

if [ "$2" = "--all" ]; then
    RESTORE_ALL=true
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log_header "♻️ Pose Server - Restore"
log_info "Project Root: $PROJECT_ROOT"
log_info "Backup File: $BACKUP_FILE"

# Get backup file size
BACKUP_SIZE=$(du -sh "$BACKUP_FILE" 2>/dev/null | cut -f1)
log_info "Backup Size: $BACKUP_SIZE"

# Create temporary directory for extraction
TEMP_DIR="restore_temp_$(date +%s)"
mkdir -p "$TEMP_DIR"

# Extract archive
log_info "Extracting archive..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted folder
EXTRACTED_FOLDER=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "backup_*" | head -n 1)

if [ -z "$EXTRACTED_FOLDER" ]; then
    log_error "Invalid backup structure. Could not find backup folder inside archive."
    rm -rf "$TEMP_DIR"
    exit 1
fi

log_success "Archive extracted to: $EXTRACTED_FOLDER"

# =====================================================
# Show backup contents
# =====================================================
log_header "📋 Backup Contents"

HAS_CONFIG=false
HAS_CERTS=false
HAS_UPLOADS=false
HAS_DATABASE=false
HAS_SOURCE=false

if [ -d "$EXTRACTED_FOLDER/config" ] || [ -f "$EXTRACTED_FOLDER/config/.env" ] || [ -f "$EXTRACTED_FOLDER/.env" ]; then
    HAS_CONFIG=true
    echo -e "  ${GREEN}✓${NC} Configuration files (.env, ecosystem.config.js, package.json)"
fi

if [ -d "$EXTRACTED_FOLDER/certs" ] && [ "$(ls -A "$EXTRACTED_FOLDER/certs" 2>/dev/null)" ]; then
    HAS_CERTS=true
    CERTS_COUNT=$(find "$EXTRACTED_FOLDER/certs" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Certificates ($CERTS_COUNT files)"
fi

if [ -d "$EXTRACTED_FOLDER/uploads" ]; then
    HAS_UPLOADS=true
    UPLOADS_COUNT=$(find "$EXTRACTED_FOLDER/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')
    UPLOADS_SIZE=$(du -sh "$EXTRACTED_FOLDER/uploads" 2>/dev/null | cut -f1)
    echo -e "  ${GREEN}✓${NC} Uploads/Images ($UPLOADS_COUNT files, $UPLOADS_SIZE)"
fi

if [ -d "$EXTRACTED_FOLDER/mongo_dump" ]; then
    HAS_DATABASE=true
    DB_SIZE=$(du -sh "$EXTRACTED_FOLDER/mongo_dump" 2>/dev/null | cut -f1)
    echo -e "  ${GREEN}✓${NC} MongoDB Database ($DB_SIZE)"
fi

if [ -d "$EXTRACTED_FOLDER/src" ]; then
    HAS_SOURCE=true
    SRC_SIZE=$(du -sh "$EXTRACTED_FOLDER/src" 2>/dev/null | cut -f1)
    echo -e "  ${GREEN}✓${NC} Source Code ($SRC_SIZE)"
fi

echo ""

# =====================================================
# Interactive restore options
# =====================================================
RESTORE_CONFIG=false
RESTORE_CERTS=false
RESTORE_UPLOADS=false
RESTORE_DATABASE=false
RESTORE_SOURCE=false

if [ "$RESTORE_ALL" = true ]; then
    log_info "Restoring all components (--all flag detected)"
    RESTORE_CONFIG=$HAS_CONFIG
    RESTORE_CERTS=$HAS_CERTS
    RESTORE_UPLOADS=$HAS_UPLOADS
    RESTORE_DATABASE=$HAS_DATABASE
    RESTORE_SOURCE=$HAS_SOURCE
else
    log_header "🔧 Select Components to Restore"
    
    if [ "$HAS_CONFIG" = true ]; then
        if ask_yes_no "Restore configuration files (.env, ecosystem.config.js)?" "y"; then
            RESTORE_CONFIG=true
        fi
    fi
    
    if [ "$HAS_CERTS" = true ]; then
        if ask_yes_no "Restore certificates?" "y"; then
            RESTORE_CERTS=true
        fi
    fi
    
    if [ "$HAS_UPLOADS" = true ]; then
        if ask_yes_no "Restore uploads/images ($UPLOADS_COUNT files, $UPLOADS_SIZE)?" "y"; then
            RESTORE_UPLOADS=true
        fi
    fi
    
    if [ "$HAS_DATABASE" = true ]; then
        echo ""
        log_warning "⚠️  Database restore will DROP all existing data!"
        if ask_yes_no "Restore MongoDB database?" "n"; then
            RESTORE_DATABASE=true
        fi
    fi
    
    if [ "$HAS_SOURCE" = true ]; then
        if ask_yes_no "Restore source code?" "n"; then
            RESTORE_SOURCE=true
        fi
    fi
fi

# Check if anything selected
if [ "$RESTORE_CONFIG" = false ] && [ "$RESTORE_CERTS" = false ] && [ "$RESTORE_UPLOADS" = false ] && [ "$RESTORE_DATABASE" = false ] && [ "$RESTORE_SOURCE" = false ]; then
    log_warning "No components selected for restore. Exiting."
    rm -rf "$TEMP_DIR"
    exit 0
fi

# =====================================================
# Perform restore
# =====================================================
log_header "🚀 Starting Restore"

# 1. Restore Configuration
if [ "$RESTORE_CONFIG" = true ]; then
    log_info "Restoring configuration..."
    
    # Check for config in new or old structure
    CONFIG_DIR="$EXTRACTED_FOLDER/config"
    if [ ! -d "$CONFIG_DIR" ]; then
        CONFIG_DIR="$EXTRACTED_FOLDER"
    fi
    
    if [ -f "$CONFIG_DIR/.env" ]; then
        if [ -f ".env" ]; then
            log_warning "Existing .env found. Backing it up to .env.bak"
            cp .env .env.bak
        fi
        cp "$CONFIG_DIR/.env" .env
        log_success ".env restored"
    fi
    
    if [ -f "$CONFIG_DIR/ecosystem.config.js" ]; then
        cp "$CONFIG_DIR/ecosystem.config.js" .
        log_success "ecosystem.config.js restored"
    fi
    
    if [ -f "$CONFIG_DIR/package.json" ]; then
        cp "$CONFIG_DIR/package.json" .
        log_success "package.json restored"
    fi
    
    if [ -f "$CONFIG_DIR/package-lock.json" ]; then
        cp "$CONFIG_DIR/package-lock.json" .
        log_success "package-lock.json restored"
    fi
fi

# 2. Restore Certificates
if [ "$RESTORE_CERTS" = true ]; then
    log_info "Restoring certificates..."
    mkdir -p certs
    cp -r "$EXTRACTED_FOLDER/certs/"* certs/
    log_success "Certificates restored"
fi

# 3. Restore Uploads
if [ "$RESTORE_UPLOADS" = true ]; then
    log_info "Restoring uploads (this may take a while)..."
    mkdir -p uploads
    if command -v rsync &> /dev/null; then
        rsync -a --info=progress2 "$EXTRACTED_FOLDER/uploads/" uploads/
    else
        cp -r "$EXTRACTED_FOLDER/uploads/"* uploads/
    fi
    log_success "Uploads restored"
fi

# 4. Restore Source Code
if [ "$RESTORE_SOURCE" = true ]; then
    log_info "Restoring source code..."
    if [ -d "src" ]; then
        log_warning "Existing src directory found. Backing it up to src.bak"
        rm -rf src.bak
        mv src src.bak
    fi
    cp -r "$EXTRACTED_FOLDER/src" .
    log_success "Source code restored"
    
    if [ -f "$EXTRACTED_FOLDER/server.js" ]; then
        cp "$EXTRACTED_FOLDER/server.js" .
        log_success "server.js restored"
    fi
fi

# 5. Restore Database (last, as it's the most critical)
if [ "$RESTORE_DATABASE" = true ]; then
    log_info "Restoring MongoDB database..."
    
    # Load .env to get URI
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -n "$MONGODB_URI" ]; then
        if command -v mongorestore &> /dev/null; then
            log_warning "This will DROP all existing data and restore from backup!"
            
            # Find the database subdirectory inside mongo_dump
            # mongodump creates: mongo_dump/<db_name>/ structure
            DUMP_DIR="$EXTRACTED_FOLDER/mongo_dump"
            DB_SUBDIR=$(find "$DUMP_DIR" -maxdepth 1 -mindepth 1 -type d | head -n 1)
            
            if [ -n "$DB_SUBDIR" ]; then
                # Extract base URI without database name for clean restore
                BASE_URI=$(echo "$MONGODB_URI" | sed 's|/[^/]*$||')
                log_info "Restoring from: $DB_SUBDIR"
                mongorestore --uri="$BASE_URI" --drop "$DUMP_DIR" 2>&1 | tail -10
            else
                # No subdirectory, restore directly (flat BSON files)
                mongorestore --uri="$MONGODB_URI" --drop "$DUMP_DIR" 2>&1 | tail -10
            fi
            log_success "Database restored"
        else
            log_error "mongorestore not found! Skipping database restore."
            log_error "Install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
        fi
    else
        log_error "MONGODB_URI not found in .env. Cannot restore database."
    fi
fi

# =====================================================
# Cleanup
# =====================================================
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# =====================================================
# Summary
# =====================================================
log_header "✅ Restore Completed!"

echo -e "Restored components:"
[ "$RESTORE_CONFIG" = true ] && echo -e "  ${GREEN}✓${NC} Configuration files"
[ "$RESTORE_CERTS" = true ] && echo -e "  ${GREEN}✓${NC} Certificates"
[ "$RESTORE_UPLOADS" = true ] && echo -e "  ${GREEN}✓${NC} Uploads/Images"
[ "$RESTORE_SOURCE" = true ] && echo -e "  ${GREEN}✓${NC} Source code"
[ "$RESTORE_DATABASE" = true ] && echo -e "  ${GREEN}✓${NC} MongoDB Database"

echo ""
log_warning "You may need to restart the server for changes to take effect:"
echo "  pm2 restart all"
echo "  # or"
echo "  ./restart.sh"
