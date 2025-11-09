# SSL Pinning để Chống Proxyman - Giải Thích

## ⚠️ QUAN TRỌNG: HPKP Headers đã DEPRECATED

**HPKP (Public-Key-Pins) headers đã bị deprecated và không còn được hỗ trợ bởi các browser/modern clients.**

## 🔒 SSL Pinning để Chống Proxyman - Cách Hoạt Động

### Vấn đề với Proxyman:
- Proxyman là một MITM (Man-in-the-Middle) proxy tool
- Nó intercept traffic giữa client app và server
- Proxyman tự tạo certificate riêng để decrypt traffic
- Nếu app không có SSL pinning, Proxyman có thể bắt được tất cả requests

### Giải pháp: SSL Pinning ở CLIENT-SIDE

**SSL Pinning phải được implement ở CLIENT APP (iOS/Android), KHÔNG phải server-side!**

#### Tại sao phải ở client-side?
1. **Proxyman hoạt động ở client-side**: Proxyman intercept traffic TRƯỚC KHI đến server
2. **Server không thể ngăn**: Server không biết được request có đi qua Proxyman hay không
3. **Client phải validate certificate**: Chỉ có client app mới có thể kiểm tra certificate có đúng không

## 📋 Cấu Hình Hiện Tại

### Server-side (đã làm đúng):
✅ **Extract pin hash từ certificate** - Script `start.sh` tự động extract pin hash
✅ **Lưu pin hash vào .env** - `SSL_PIN_HASH` được lưu trong `.env`
✅ **Endpoint để lấy pin hash** - `/api/ssl-pin-info` (optional, có thể hardcode trong app)
✅ **Anti-MITM detection** - Middleware phát hiện dấu hiệu MITM proxy

### Client-side (CẦN IMPLEMENT):
❌ **Chưa implement SSL pinning trong mobile app**
- iOS app cần implement certificate pinning
- Android app cần implement certificate pinning
- Sử dụng pin hash từ server để validate certificate

## 🛠️ Cách Implement SSL Pinning ở Client

### 1. Lấy Pin Hash từ Server

```bash
# Chạy script start.sh để extract pin hash
./start.sh

# Hoặc chạy trực tiếp:
npm run extract-pin /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Pin hash sẽ được lưu trong:
# - .env: SSL_PIN_HASH=...
# - certs/pin-hash.txt
```

### 2. Implement trong iOS App (Swift)

```swift
// Sử dụng pin hash từ server
let pinnedPublicKeyHashes: [String] = [
    "YOUR_PIN_HASH_FROM_SERVER" // Lấy từ .env hoặc /api/ssl-pin-info
]

// Implement URLSessionDelegate để validate certificate
func urlSession(_ session: URLSession, 
                didReceive challenge: URLAuthenticationChallenge,
                completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    
    guard let serverTrust = challenge.protectionSpace.serverTrust else {
        completionHandler(.cancelAuthenticationChallenge, nil)
        return
    }
    
    // Validate certificate với pinned hash
    if validateCertificate(serverTrust: serverTrust, pinnedHashes: pinnedPublicKeyHashes) {
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
    } else {
        completionHandler(.cancelAuthenticationChallenge, nil)
    }
}
```

### 3. Implement trong Android App (Kotlin)

```kotlin
// Sử dụng pin hash từ server
private val PINNED_PUBLIC_KEY_HASHES = listOf(
    "sha256/YOUR_PIN_HASH_FROM_SERVER" // Lấy từ .env hoặc /api/ssl-pin-info
)

// Tạo OkHttpClient với certificate pinning
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("yourdomain.com", *PINNED_PUBLIC_KEY_HASHES.toTypedArray())
            .build()
    )
    .build()
```

## ✅ Checklist để Chống Proxyman

### Server-side (✅ Đã làm):
- [x] Extract pin hash từ certificate
- [x] Lưu pin hash vào .env
- [x] Endpoint để lấy pin hash
- [x] Anti-MITM detection middleware

### Client-side (❌ Cần làm):
- [ ] Implement certificate pinning trong iOS app
- [ ] Implement certificate pinning trong Android app
- [ ] Hardcode pin hash trong app (hoặc fetch từ server lần đầu)
- [ ] Test với Proxyman để đảm bảo không bắt được request

## 🧪 Test SSL Pinning

### Test với Proxyman:
1. **Bật Proxyman** và cấu hình để intercept traffic
2. **Chạy mobile app** và thử kết nối đến server
3. **Kết quả mong đợi**:
   - ✅ Nếu SSL pinning hoạt động: App sẽ **từ chối kết nối** và không gửi request
   - ❌ Nếu không có SSL pinning: Proxyman sẽ **bắt được tất cả requests**

### Test certificate validation:
```bash
# Test với curl (sẽ fail nếu có pinning)
curl -k https://yourdomain.com/api/health

# Test với openssl
openssl s_client -connect yourdomain.com:443 -showcerts
```

## 📝 Lưu Ý Quan Trọng

1. **Pin hash phải được hardcode trong app** hoặc fetch từ server lần đầu (không nên fetch mỗi lần)
2. **Khi renew certificate**, cần:
   - Extract pin hash mới
   - Update pin hash trong app
   - Release app version mới
3. **Backup pin**: Nên có backup pin để tránh downtime khi đổi certificate
4. **Test kỹ**: Test SSL pinning trước khi release production

## 🔗 Tài Liệu Tham Khảo

- [SSL Pinning Guide](./ssl-pinning-guide.md) - Hướng dẫn chi tiết
- [iOS SSL Pinning](https://developer.apple.com/documentation/security/certificate_key_and_trust_services)
- [Android SSL Pinning](https://square.github.io/okhttp/4.x/okhttp/okhttp3/-certificate-pinner/)

## ❓ FAQ

**Q: Tại sao server-side headers không chống được Proxyman?**
A: Proxyman intercept traffic ở client-side, trước khi đến server. Server không thể biết request có đi qua Proxyman hay không.

**Q: Có cần implement SSL pinning ở cả server và client không?**
A: Không. SSL pinning chỉ cần implement ở client-side. Server chỉ cần cung cấp pin hash.

**Q: Làm sao để update pin hash khi renew certificate?**
A: Extract pin hash mới, update trong app, và release version mới. Nên có backup pin để tránh downtime.

