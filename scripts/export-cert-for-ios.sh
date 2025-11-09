#!/bin/bash

# 📱 Script export certificate cho iOS developer
# Tạo file .cer và pin hash để iOS developer có thể cấu hình SSL pinning

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Export Certificate cho iOS Developer            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kiểm tra quyền root
if [[ $EUID -eq 0 ]]; then
    SUDO_PREFIX=""
else
    SUDO_PREFIX="sudo"
fi

# Đọc domain từ .env
if [ ! -f .env ]; then
    log_error "File .env không tồn tại!"
    exit 1
fi

API_BASE_URL=$(grep -E "^API_BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
if [ -z "$API_BASE_URL" ]; then
    API_BASE_URL=$(grep -E "^BASE_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
fi

if [ -z "$API_BASE_URL" ]; then
    log_error "Không tìm thấy API_BASE_URL hoặc BASE_URL trong .env"
    exit 1
fi

DOMAIN=$(echo "$API_BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
log_info "Domain: $DOMAIN"

# Đường dẫn certificate
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$CERT_PATH" ]; then
    log_error "Certificate không tồn tại tại: $CERT_PATH"
    exit 1
fi

log_success "Certificate tìm thấy: $CERT_PATH"

# Tạo thư mục certs nếu chưa có
mkdir -p certs
OUTPUT_DIR="certs"

# 1. Export certificate sang DER format (.cer) cho iOS
log_info "Đang export certificate sang DER format (.cer) cho iOS..."
IOS_CERT_FILE="$OUTPUT_DIR/server.cer"

# Kiểm tra xem có openssl không
if ! command -v openssl &> /dev/null; then
    log_error "openssl chưa được cài đặt!"
    log_info "Cài đặt: $SUDO_PREFIX apt-get install -y openssl"
    exit 1
fi

# Export certificate từ fullchain.pem (chỉ lấy leaf certificate)
# Lấy certificate đầu tiên từ fullchain
$SUDO_PREFIX openssl x509 -in "$CERT_PATH" -outform DER -out "$IOS_CERT_FILE" 2>/dev/null || {
    log_error "Không thể export certificate"
    exit 1
}

log_success "Certificate đã được export: $IOS_CERT_FILE"

# 2. Extract pin hash
log_info "Đang extract SSL pin hash..."
if [ -f "scripts/extract-pin.js" ]; then
    node scripts/extract-pin.js "$CERT_PATH" > /tmp/extract-pin-output.txt 2>&1 || {
        log_warning "Không thể extract pin hash bằng script"
    }
    
    # Đọc pin hash từ file
    PIN_HASH_FILE="$OUTPUT_DIR/pin-hash.txt"
    if [ -f "$PIN_HASH_FILE" ]; then
        PIN_HASH=$(cat "$PIN_HASH_FILE" | tr -d '\n' | xargs)
        log_success "Pin hash: $PIN_HASH"
    else
        log_warning "Không tìm thấy pin hash file"
    fi
else
    log_warning "Script extract-pin.js không tồn tại"
fi

# 3. Tạo file hướng dẫn cho iOS developer
log_info "Đang tạo file hướng dẫn cho iOS developer..."
GUIDE_FILE="$OUTPUT_DIR/IOS_SSL_PINNING_GUIDE.md"

cat > "$GUIDE_FILE" << EOF
# Hướng Dẫn Cấu Hình SSL Pinning cho iOS

## Files Cần Thiết

1. **server.cer** - Certificate file (đã được export)
2. **pin-hash.txt** - Public key hash (SHA256) - nếu dùng public key pinning

## Bước 1: Add Certificate vào Xcode Project

1. Mở Xcode project
2. Drag file \`server.cer\` vào project navigator
3. Đảm bảo:
   - ✅ "Copy items if needed" được check
   - ✅ Add vào target của app
   - ✅ File được add vào "Copy Bundle Resources" trong Build Phases

## Bước 2: Implement SSL Pinning

### Option A: Certificate Pinning (Đơn giản hơn)

Sử dụng file \`server.cer\` đã được add vào project.

### Option B: Public Key Pinning (Khuyến nghị - Linh hoạt hơn)

Sử dụng pin hash từ file \`pin-hash.txt\`:

\`\`\`swift
let pinnedPublicKeyHashes: [String] = [
    "$PIN_HASH",
]
\`\`\`

## Bước 3: Code Implementation

Xem file \`ssl-pinning-guide.md\` trong project root để xem code mẫu đầy đủ.

## Lưu Ý

- Domain: \`$DOMAIN\`
- Certificate expires: Check trong certificate
- Khi certificate renew, cần update pin hash trong code
- Test kỹ trước khi release production

## Testing

1. Test với server thực tế
2. Test với certificate không hợp lệ (sẽ fail - đúng như mong đợi)
3. Test với certificate hợp lệ (sẽ pass)

EOF

log_success "File hướng dẫn đã được tạo: $GUIDE_FILE"

# 4. Tạo file Swift code mẫu
log_info "Đang tạo file Swift code mẫu..."
SWIFT_CODE_FILE="$OUTPUT_DIR/SSLPinningManager.swift"

cat > "$SWIFT_CODE_FILE" << 'SWIFTEOF'
import Foundation
import Security
import CommonCrypto

class SSLPinningManager: NSObject, URLSessionDelegate {
    
    // Singleton instance
    static let shared = SSLPinningManager()
    
    private override init() {
        super.init()
    }
    
    // MARK: - Public Key Hashes (Update với pin hash từ pin-hash.txt)
    // TODO: Thay thế bằng pin hash từ pin-hash.txt
    // Ví dụ: private let pinnedPublicKeyHashes: [String] = ["ABC123...XYZ789"]
    private let pinnedPublicKeyHashes: [String] = [
        // Copy pin hash từ pin-hash.txt vào đây
    ]
    
    // MARK: - URLSession Configuration
    
    func createURLSession() -> URLSession {
        let configuration = URLSessionConfiguration.default
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }
    
    // MARK: - URLSessionDelegate - Public Key Pinning
    
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Lấy certificates từ server
        let serverCertificates = (0..<SecTrustGetCertificateCount(serverTrust))
            .compactMap { SecTrustGetCertificateAtIndex(serverTrust, $0) }
        
        guard !serverCertificates.isEmpty else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Kiểm tra public key hash
        var isValid = false
        for serverCert in serverCertificates {
            // Lấy public key từ certificate
            guard let publicKey = SecCertificateCopyPublicKey(serverCert) else {
                continue
            }
            
            // Export public key data
            var error: Unmanaged<CFError>?
            guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
                continue
            }
            
            // Tính SHA256 hash
            var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
            publicKeyData.withUnsafeBytes { bytes in
                _ = CC_SHA256(bytes.baseAddress, CC_LONG(publicKeyData.count), &hash)
            }
            
            // Convert sang base64
            let hashBase64 = Data(hash).base64EncodedString()
            
            // So sánh với pinned hashes
            if pinnedPublicKeyHashes.contains(hashBase64) {
                isValid = true
                break
            }
        }
        
        if isValid {
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
            print("✅ SSL Pinning: Public key hợp lệ")
        } else {
            print("❌ SSL Pinning: Public key không khớp")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

SWIFTEOF

log_success "File Swift code mẫu đã được tạo: $SWIFT_CODE_FILE"

# 5. Tạo file README tổng hợp
log_info "Đang tạo file README..."
README_FILE="$OUTPUT_DIR/README.md"

cat > "$README_FILE" << EOF
# SSL Certificate Files cho iOS Developer

## Files trong thư mục này:

1. **server.cer** - Certificate file (DER format) để add vào Xcode project
2. **pin-hash.txt** - Public key hash (SHA256) để hardcode trong code
3. **IOS_SSL_PINNING_GUIDE.md** - Hướng dẫn chi tiết
4. **SSLPinningManager.swift** - Code mẫu Swift

## Quick Start

1. Add \`server.cer\` vào Xcode project
2. Copy pin hash từ \`pin-hash.txt\` vào code
3. Xem \`IOS_SSL_PINNING_GUIDE.md\` để biết chi tiết

## Domain

- Domain: \`$DOMAIN\`
- API Base URL: \`$API_BASE_URL\`

## Lưu Ý

- Certificate sẽ expire và cần renew
- Khi certificate renew, pin hash có thể thay đổi
- Cần update pin hash trong code khi certificate renew
- Test kỹ trước khi release

EOF

log_success "File README đã được tạo: $README_FILE"

# Hiển thị thông tin
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║              EXPORT HOÀN TẤT!                      ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

log_info "📁 Files đã được tạo trong thư mục: $OUTPUT_DIR/"
echo ""
echo "  ✅ server.cer - Certificate file cho iOS"
if [ -f "$OUTPUT_DIR/pin-hash.txt" ]; then
    echo "  ✅ pin-hash.txt - Public key hash"
    echo "     Pin hash: $(cat $OUTPUT_DIR/pin-hash.txt)"
fi
echo "  ✅ IOS_SSL_PINNING_GUIDE.md - Hướng dẫn chi tiết"
echo "  ✅ SSLPinningManager.swift - Code mẫu Swift"
echo "  ✅ README.md - Tổng quan"
echo ""

log_info "📋 Bước tiếp theo:"
echo "  1. Copy toàn bộ thư mục '$OUTPUT_DIR' cho iOS developer"
echo "  2. Hoặc zip lại: zip -r certs-for-ios.zip $OUTPUT_DIR/"
echo "  3. iOS developer sẽ:"
echo "     - Add server.cer vào Xcode project"
echo "     - Copy pin hash vào code"
echo "     - Implement SSL pinning theo hướng dẫn"
echo ""

log_success "🎉 Hoàn thành! Files đã sẵn sàng cho iOS developer!"

