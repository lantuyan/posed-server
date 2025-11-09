# Hướng Dẫn Cấu Hình SSL Pinning

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [SSL Pinning là gì?](#ssl-pinning-là-gì)
3. [Cấu Hình Phía Server](#cấu-hình-phía-server)
4. [Cấu Hình Phía Client (Mobile App)](#cấu-hình-phía-client-mobile-app)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

SSL Pinning (Certificate Pinning) là một kỹ thuật bảo mật để đảm bảo ứng dụng chỉ kết nối với server có chứng chỉ SSL/TLS cụ thể, ngăn chặn các cuộc tấn công Man-in-the-Middle (MITM).

Hướng dẫn này bao gồm:
- **Server-side**: Cấu hình certificate pinning headers và HTTPS
- **Client-side**: Triển khai SSL pinning trong mobile app (iOS và Android)

---

## SSL Pinning là gì?

SSL Pinning hoạt động bằng cách:
1. **Lưu trữ hash của public key** hoặc chứng chỉ SSL của server trong ứng dụng
2. **So sánh hash** khi kết nối với server
3. **Từ chối kết nối** nếu hash không khớp

### Lợi ích:
- ✅ Ngăn chặn MITM attacks
- ✅ Bảo vệ dữ liệu nhạy cảm
- ✅ Tăng độ tin cậy của kết nối

### Lưu ý:
- ⚠️ Cần cập nhật app khi đổi certificate
- ⚠️ Cần backup pin để tránh downtime
- ⚠️ Khó debug khi có vấn đề

---

## Cấu Hình Phía Server

### 0. Quyết Định Domain Cần Pin

**Câu hỏi quan trọng: Pin domain chính hay subdomain?**

**Trả lời: Pin đúng domain mà app của bạn kết nối tới!**

Ví dụ:
- Nếu `BASE_URL=https://pose.sixpilot.technology` → **Pin `pose.sixpilot.technology`** (subdomain)
- Nếu `BASE_URL=https://sixpilot.technology` → **Pin `sixpilot.technology`** (domain chính)

**Lý do:**
- SSL pinning kiểm tra chính xác domain trong certificate
- App chỉ chấp nhận certificate được cấp cho domain mà nó kết nối
- Nếu pin `sixpilot.technology` nhưng app kết nối `pose.sixpilot.technology`, pinning sẽ **FAIL** (trừ khi certificate là wildcard `*.sixpilot.technology`)

**Best Practice:**
- ✅ Pin đúng domain/subdomain mà app sử dụng
- ✅ Sử dụng flag `includeSubDomains` trong HPKP headers nếu muốn áp dụng cho tất cả subdomains
- ✅ Nếu cần nhiều subdomains, cân nhắc wildcard certificate: `*.sixpilot.technology`

### 1. Thiết Lập HTTPS với Express.js

#### Bước 1: Tạo SSL Certificate

**Option A: Sử dụng Let's Encrypt (Production)**

```bash
# Cài đặt certbot
sudo apt-get update
sudo apt-get install certbot

# Lấy certificate cho domain của bạn
# LƯU Ý: Pin subdomain mà app thực sự kết nối tới
# Ví dụ: Nếu app kết nối tới pose.sixpilot.technology, thì pin domain đó
sudo certbot certonly --standalone -d pose.sixpilot.technology

# Nếu muốn hỗ trợ cả www subdomain:
# sudo certbot certonly --standalone -d pose.sixpilot.technology -d www.pose.sixpilot.technology
```

Certificates sẽ được lưu tại:
- `/etc/letsencrypt/live/pose.sixpilot.technology/fullchain.pem`
- `/etc/letsencrypt/live/pose.sixpilot.technology/privkey.pem`

**Lưu ý:** Đường dẫn sẽ là domain bạn đã chỉ định trong lệnh certbot

**Option B: Tạo Self-Signed Certificate (Development/Testing)**

```bash
# Tạo thư mục chứa certificates
mkdir -p /Users/quelannguyen/workspace/posed/posed-server/certs

# Tạo private key
openssl genrsa -out certs/server.key 2048

# Tạo certificate signing request
openssl req -new -key certs/server.key -out certs/server.csr

# Tạo self-signed certificate (valid 365 days)
openssl x509 -req -days 365 -in certs/server.csr -signkey certs/server.key -out certs/server.crt

# Tạo fullchain (cho production với Let's Encrypt)
cat certs/server.crt > certs/fullchain.pem
```

**Lưu ý**: Thêm `certs/` vào `.gitignore` để không commit certificates.

#### Bước 2: Cài Đặt Dependencies

```bash
npm install https --save
```

#### Bước 3: Cập Nhật File `server.js`

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');
const { app, connectDB } = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

// Connect to database
connectDB();

// SSL Certificate paths
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'certs', 'server.key');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'certs', 'server.crt');
const SSL_FULLCHAIN_PATH = process.env.SSL_FULLCHAIN_PATH || path.join(__dirname, 'certs', 'fullchain.pem');

// Check if SSL files exist
const useHTTPS = process.env.USE_HTTPS === 'true' && 
                 fs.existsSync(SSL_KEY_PATH) && 
                 fs.existsSync(SSL_CERT_PATH);

if (useHTTPS) {
  // Read SSL certificates
  const options = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_FULLCHAIN_PATH || SSL_CERT_PATH),
    // Security options
    secureProtocol: 'TLSv1_2_method',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      '!aNULL',
      '!eNULL',
      '!EXPORT',
      '!DES',
      '!RC4',
      '!MD5',
      '!PSK',
      '!SRP',
      '!CAMELLIA'
    ].join(':'),
    honorCipherOrder: true
  };

  // Create HTTPS server
  const server = https.createServer(options, app);
  const PORT = config.port || 3443;

  server.listen(PORT, () => {
    logger.info(`HTTPS Server running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.info(`Server URL: https://localhost:${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
} else {
  // Fallback to HTTP (development only)
  const PORT = config.port || 3000;
  const server = app.listen(PORT, () => {
    logger.warn(`HTTP Server running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.warn('⚠️  WARNING: Running without HTTPS. SSL Pinning will not work!');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}
```

#### Bước 4: Cập Nhật File `src/app.js` - Thêm Public Key Pinning Headers

Thêm middleware để gửi Public Key Pinning headers:

```javascript
// ... existing code ...

// Security middleware - skip for Swagger routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    return next();
  }
  helmet()(req, res, next);
});

// Public Key Pinning (HPKP) - Add after helmet middleware
app.use((req, res, next) => {
  if (req.secure || process.env.NODE_ENV === 'production') {
    // Lấy public key hash từ certificate
    // Sử dụng công cụ online hoặc script để generate hash
    const pins = [
      'pin-sha256="BASE64_HASH_OF_YOUR_PUBLIC_KEY_1"', // Primary key
      'pin-sha256="BASE64_HASH_OF_YOUR_PUBLIC_KEY_2"', // Backup key
    ];
    
    // Thời gian pinning (max 60 days)
    const maxAge = 5184000; // 60 days in seconds
    
    res.setHeader('Public-Key-Pins', `${pins.join('; ')}; max-age=${maxAge}; includeSubDomains`);
    res.setHeader('Public-Key-Pins-Report-Only', `${pins.join('; ')}; max-age=${maxAge}; includeSubDomains; report-uri="/api/report-pin-violation"`);
  }
  next();
});

// ... existing code ...
```

#### Bước 5: Tạo Script Để Extract Public Key Hash

Tạo file `scripts/extract-pin.js`:

```javascript
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Đường dẫn đến certificate
const certPath = process.argv[2] || path.join(__dirname, '..', 'certs', 'server.crt');

try {
  // Đọc certificate
  const cert = fs.readFileSync(certPath, 'utf8');
  
  // Parse certificate
  const certObj = crypto.createPublicKey(cert);
  const publicKeyDer = certObj.export({ type: 'spki', format: 'der' });
  
  // Tính SHA256 hash
  const hash = crypto.createHash('sha256').update(publicKeyDer).digest('base64');
  
  console.log('\n=== Public Key Pin (SHA256) ===');
  console.log(`pin-sha256="${hash}"`);
  console.log('\n=== Cấu hình cho app.js ===');
  console.log(`const pins = ['pin-sha256="${hash}"'];`);
  console.log('\n✅ Copy hash trên để sử dụng trong app.js\n');
  
  // Lưu vào file
  const outputPath = path.join(__dirname, '..', 'certs', 'pin-hash.txt');
  fs.writeFileSync(outputPath, hash);
  console.log(`📝 Hash đã được lưu vào: ${outputPath}\n`);
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error('\nCách sử dụng:');
  console.error('  node scripts/extract-pin.js [path-to-certificate]');
  process.exit(1);
}
```

Thêm script vào `package.json`:

```json
{
  "scripts": {
    "extract-pin": "node scripts/extract-pin.js"
  }
}
```

#### Bước 6: Cập Nhật File `.env`

```env
# SSL Configuration
USE_HTTPS=true
SSL_KEY_PATH=/path/to/server.key
SSL_CERT_PATH=/path/to/server.crt
SSL_FULLCHAIN_PATH=/path/to/fullchain.pem

# Server URL với HTTPS
BASE_URL=https://yourdomain.com
```

#### Bước 7: Chạy Script Extract Pin

```bash
# Extract pin từ certificate
npm run extract-pin certs/server.crt

# Copy hash được hiển thị và cập nhật vào app.js
```

### 2. Cấu Hình Helmet cho HTTPS

Helmet đã được cấu hình, nhưng cần đảm bảo HSTS được bật:

```javascript
// Trong src/app.js, cập nhật helmet configuration
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    return next();
  }
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })(req, res, next);
});
```

---

## Cấu Hình Phía Client (Mobile App)

### iOS - Swift Implementation

#### Bước 1: Tạo Certificate File

```bash
# Export certificate từ server
# QUAN TRỌNG: Sử dụng đúng subdomain mà app kết nối tới
openssl s_client -showcerts -connect pose.sixpilot.technology:443 -servername pose.sixpilot.technology < /dev/null | openssl x509 -outform DER > server.cer

# Hoặc copy file .crt từ server
```

#### Bước 2: Add Certificate vào Project

1. Drag file `server.cer` vào Xcode project
2. Đảm bảo "Copy items if needed" được check
3. Add vào target của app

#### Bước 3: Tạo SSL Pinning Manager

Tạo file `SSLPinningManager.swift`:

```swift
import Foundation
import Security

class SSLPinningManager: NSObject, URLSessionDelegate {
    
    // Singleton instance
    static let shared = SSLPinningManager()
    
    private override init() {
        super.init()
    }
    
    // MARK: - URLSession Configuration
    
    func createURLSession() -> URLSession {
        let configuration = URLSessionConfiguration.default
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }
    
    // MARK: - URLSessionDelegate
    
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Lấy certificate từ server
        let serverCertificates = (0..<SecTrustGetCertificateCount(serverTrust))
            .compactMap { SecTrustGetCertificateAtIndex(serverTrust, $0) }
        
        guard !serverCertificates.isEmpty else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Load local certificate
        guard let localCertificatePath = Bundle.main.path(forResource: "server", ofType: "cer"),
              let localCertificateData = NSData(contentsOfFile: localCertificatePath) else {
            print("❌ SSL Pinning: Không tìm thấy local certificate")
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // So sánh certificates
        let isValid = serverCertificates.contains { serverCert in
            let serverCertData = SecCertificateCopyData(serverCert) as Data
            return serverCertData == localCertificateData as Data
        }
        
        if isValid {
            // Certificate hợp lệ, chấp nhận connection
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
            print("✅ SSL Pinning: Certificate hợp lệ")
        } else {
            // Certificate không khớp, từ chối connection
            print("❌ SSL Pinning: Certificate không khớp")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
    
    // MARK: - Public Key Pinning (Alternative - Recommended)
    
    func urlSessionPublicKeyPinning(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Danh sách public key hashes (SHA256) - từ server extract-pin.js
        let pinnedPublicKeyHashes: [String] = [
            "BASE64_HASH_OF_YOUR_PUBLIC_KEY_1", // Primary
            "BASE64_HASH_OF_YOUR_PUBLIC_KEY_2"  // Backup
        ]
        
        // Lấy public key từ server certificate
        let serverCertificates = (0..<SecTrustGetCertificateCount(serverTrust))
            .compactMap { SecTrustGetCertificateAtIndex(serverTrust, $0) }
        
        guard let serverCertificate = serverCertificates.first else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Tính hash của public key
        guard let serverPublicKey = SecCertificateCopyKey(serverCertificate),
              let serverPublicKeyData = SecKeyCopyExternalRepresentation(serverPublicKey, nil) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        let serverPublicKeyHash = sha256(data: serverPublicKeyData as Data)
        let serverPublicKeyHashBase64 = serverPublicKeyHash.base64EncodedString()
        
        // So sánh với pinned hashes
        let isValid = pinnedPublicKeyHashes.contains(serverPublicKeyHashBase64)
        
        if isValid {
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
            print("✅ SSL Pinning: Public key hợp lệ")
        } else {
            print("❌ SSL Pinning: Public key không khớp. Server: \(serverPublicKeyHashBase64)")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
    
    // MARK: - Helper Functions
    
    private func sha256(data: Data) -> Data {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }
        return Data(hash)
    }
}

// MARK: - Crypto Import
import CommonCrypto
```

#### Bước 4: Sử Dụng trong Network Requests

```swift
import Foundation

class APIService {
    private let session: URLSession
    
    init() {
        // Sử dụng SSL Pinning Manager
        self.session = SSLPinningManager.shared.createURLSession()
    }
    
    func makeRequest(url: URL, completion: @escaping (Result<Data, Error>) -> Void) {
        let task = session.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }
            
            completion(.success(data))
        }
        
        task.resume()
    }
}
```

#### Bước 5: Cấu Hình App Transport Security (ATS)

Trong `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <!-- Sử dụng đúng subdomain mà app kết nối tới -->
        <key>pose.sixpilot.technology</key>
        <dict>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <false/>
            <key>NSIncludesSubdomains</key>
            <false/>
            <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
            <false/>
        </dict>
    </dict>
</dict>
```

### Android - Kotlin Implementation

#### Bước 1: Tạo Certificate File

```bash
# Export certificate từ server
# QUAN TRỌNG: Sử dụng đúng subdomain mà app kết nối tới
openssl s_client -showcerts -connect pose.sixpilot.technology:443 -servername pose.sixpilot.technology < /dev/null | openssl x509 -outform PEM > server.pem

# Hoặc copy file .crt từ server
```

#### Bước 2: Add Certificate vào Project

1. Tạo thư mục `app/src/main/res/raw/`
2. Copy file `server.pem` vào thư mục `raw/`
3. Đổi tên thành `server_certificate.pem`

#### Bước 3: Tạo SSL Pinning Manager

Tạo file `SSLPinningManager.kt`:

```kotlin
package com.yourpackage.network

import android.content.Context
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.io.InputStream
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

class SSLPinningManager(private val context: Context) {
    
    companion object {
        // Public key hashes (SHA256) - từ server extract-pin.js
        // QUAN TRỌNG: Sử dụng đúng domain/subdomain mà app kết nối tới
        // Ví dụ: Nếu BASE_URL=https://pose.sixpilot.technology thì dùng "pose.sixpilot.technology"
        private const val PINNED_DOMAIN = "pose.sixpilot.technology"
        private val PINNED_PUBLIC_KEY_HASHES = listOf(
            "sha256/BASE64_HASH_OF_YOUR_PUBLIC_KEY_1", // Primary
            "sha256/BASE64_HASH_OF_YOUR_PUBLIC_KEY_2"  // Backup
        )
    }
    
    /**
     * Tạo OkHttpClient với Certificate Pinning (Public Key Pinning)
     * Đây là cách được khuyến nghị vì không cần embed certificate
     */
    fun createOkHttpClientWithPublicKeyPinning(): OkHttpClient {
        val certificatePinner = CertificatePinner.Builder()
            .add(PINNED_DOMAIN, PINNED_PUBLIC_KEY_HASHES[0])
            .apply {
                // Thêm backup pins nếu có
                if (PINNED_PUBLIC_KEY_HASHES.size > 1) {
                    PINNED_PUBLIC_KEY_HASHES.subList(1, PINNED_PUBLIC_KEY_HASHES.size)
                        .forEach { add(PINNED_DOMAIN, it) }
                }
            }
            .build()
        
        return OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .build()
    }
    
    /**
     * Tạo OkHttpClient với Certificate Pinning (Full Certificate)
     * Cần embed certificate file vào app
     */
    fun createOkHttpClientWithCertificatePinning(): OkHttpClient {
        val certificateFactory = CertificateFactory.getInstance("X.509")
        val inputStream: InputStream = context.resources.openRawResource(
            context.resources.getIdentifier("server_certificate", "raw", context.packageName)
        )
        val certificate = certificateFactory.generateCertificate(inputStream) as X509Certificate
        inputStream.close()
        
        // Tạo TrustManager với pinned certificate
        val keyStoreType = KeyStore.getDefaultType()
        val keyStore = KeyStore.getInstance(keyStoreType)
        keyStore.load(null, null)
        keyStore.setCertificateEntry("server", certificate)
        
        val trustManagerFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        )
        trustManagerFactory.init(keyStore)
        
        val trustManagers = trustManagerFactory.trustManagers
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, trustManagers, null)
        
        return OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustManagers[0] as X509TrustManager)
            .build()
    }
    
    /**
     * Tạo OkHttpClient với cả Public Key Pinning và Certificate Pinning
     */
    fun createOkHttpClientWithBothPinnings(): OkHttpClient {
        val certificatePinner = CertificatePinner.Builder()
            .add(PINNED_DOMAIN, PINNED_PUBLIC_KEY_HASHES[0])
            .apply {
                if (PINNED_PUBLIC_KEY_HASHES.size > 1) {
                    PINNED_PUBLIC_KEY_HASHES.subList(1, PINNED_PUBLIC_KEY_HASHES.size)
                        .forEach { add(PINNED_DOMAIN, it) }
                }
            }
            .build()
        
        val certificateFactory = CertificateFactory.getInstance("X.509")
        val inputStream: InputStream = context.resources.openRawResource(
            context.resources.getIdentifier("server_certificate", "raw", context.packageName)
        )
        val certificate = certificateFactory.generateCertificate(inputStream) as X509Certificate
        inputStream.close()
        
        val keyStoreType = KeyStore.getDefaultType()
        val keyStore = KeyStore.getInstance(keyStoreType)
        keyStore.load(null, null)
        keyStore.setCertificateEntry("server", certificate)
        
        val trustManagerFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        )
        trustManagerFactory.init(keyStore)
        
        val trustManagers = trustManagerFactory.trustManagers
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, trustManagers, null)
        
        return OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .sslSocketFactory(sslContext.socketFactory, trustManagers[0] as X509TrustManager)
            .build()
    }
}
```

**Lưu ý**: Import các dependencies cần thiết:

```kotlin
import java.security.KeyStore
```

#### Bước 4: Sử Dụng trong Network Requests

```kotlin
package com.yourpackage.network

import android.content.Context
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ApiClient(private val context: Context) {
    
    private val sslPinningManager = SSLPinningManager(context)
    
    // Sử dụng Public Key Pinning (Khuyến nghị)
    private val okHttpClient: OkHttpClient = 
        sslPinningManager.createOkHttpClientWithPublicKeyPinning()
    
    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl("https://pose.sixpilot.technology/api/")
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
```

#### Bước 5: Cấu Hình Network Security Config

Tạo file `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config>
        <!-- Sử dụng đúng subdomain mà app kết nối tới -->
        <domain includeSubdomains="false">pose.sixpilot.technology</domain>
        <trust-anchors>
            <!-- Chỉ trust certificates từ system và pinned certificates -->
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
        <pin-set expiration="2025-12-31">
            <!-- Public key hashes -->
            <pin digest="SHA-256">BASE64_HASH_OF_YOUR_PUBLIC_KEY_1</pin>
            <pin digest="SHA-256">BASE64_HASH_OF_YOUR_PUBLIC_KEY_2</pin>
        </pin-set>
    </domain-config>
    
    <!-- Chặn tất cả HTTP connections -->
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

Cập nhật `AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
    ...
</application>
```

### React Native - Implementation

#### Bước 1: Cài Đặt Package

```bash
npm install react-native-ssl-pinning
# hoặc
yarn add react-native-ssl-pinning
```

#### Bước 2: Extract Certificate Hash

```bash
# Extract pin từ certificate
# QUAN TRỌNG: Sử dụng đúng subdomain mà app kết nối tới
openssl s_client -showcerts -connect pose.sixpilot.technology:443 -servername pose.sixpilot.technology < /dev/null | openssl x509 -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
```

#### Bước 3: Sử Dụng trong Code

```javascript
import { fetch } from 'react-native-ssl-pinning';

const makeRequest = async (url, method = 'GET', data = null) => {
  try {
    const response = await fetch(url, {
      method: method,
      sslPinning: {
        certs: ['SHA256_OF_YOUR_CERTIFICATE'], // Array of hashes
      },
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : null,
    });
    
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('SSL Pinning Error:', error);
    throw error;
  }
};
```

---

## Best Practices

### 1. Backup Pins
- ✅ Luôn có ít nhất 2 pins (primary + backup)
- ✅ Rotate pins trước khi certificate hết hạn
- ✅ Test với backup pin trước khi deploy

### 2. Certificate Management
- ✅ Monitor certificate expiration
- ✅ Setup alerts 30 days trước khi hết hạn
- ✅ Document pin rotation process

### 3. Development vs Production
- ✅ Disable pinning trong development (optional)
- ✅ Enable pinning trong production
- ✅ Sử dụng feature flags để control

### 4. Error Handling
- ✅ Log pinning failures (không log sensitive data)
- ✅ Provide user-friendly error messages
- ✅ Implement retry logic (không retry khi pinning fails)

### 5. Testing
- ✅ Test với valid certificate
- ✅ Test với invalid certificate (should fail)
- ✅ Test với MITM attack (should fail)
- ✅ Test certificate rotation

### 6. Security Considerations
- ⚠️ Không hardcode pins trong code (sử dụng config)
- ⚠️ Obfuscate pins trong production builds
- ⚠️ Sử dụng Public Key Pinning thay vì Certificate Pinning khi có thể
- ⚠️ Implement certificate pinning reporting

---

## Troubleshooting

### Server-side Issues

#### Problem: Certificate không được trust
**Solution**: 
- Đảm bảo certificate chain đầy đủ
- Kiểm tra certificate expiration
- Verify certificate được sign bởi trusted CA

#### Problem: HPKP headers không được gửi
**Solution**:
- Kiểm tra connection là HTTPS
- Verify middleware được add đúng thứ tự
- Check browser console để xem headers

### Client-side Issues

#### Problem: iOS - Certificate không match
**Solution**:
- Verify certificate file được add đúng vào bundle
- Check certificate format (DER cho .cer)
- Ensure certificate không expired
- Test với public key pinning thay vì certificate pinning

#### Problem: Android - CertificatePinnerException
**Solution**:
- Verify pin hash format (sha256/...)
- Check domain matches exactly
- Ensure backup pins được add
- Test với certificate pinning alternative

#### Problem: React Native - SSL Pinning fails
**Solution**:
- Verify certificate hash format
- Check network configuration
- Ensure certificate không expired
- Test với curl để verify certificate

### Common Errors

#### Error: "Certificate pinning failure"
**Cause**: Certificate hoặc public key không khớp
**Fix**: 
1. Extract pin mới từ server
2. Update pins trong app
3. Rebuild và redeploy app

#### Error: "Network request failed"
**Cause**: SSL handshake failed
**Fix**:
1. Check server SSL configuration
2. Verify certificate validity
3. Test connection với curl

#### Error: "Trust evaluation failed"
**Cause**: Certificate chain không complete
**Fix**:
1. Include full certificate chain
2. Verify intermediate certificates
3. Check certificate order

---

## Testing SSL Pinning

### 1. Test với Valid Certificate
```bash
# Should succeed
curl -v https://pose.sixpilot.technology/api/health
```

### 2. Test với Invalid Certificate (MITM Simulation)
```bash
# Setup proxy với invalid certificate
# App should reject connection
```

### 3. Test Certificate Rotation
```bash
# 1. Deploy new certificate với backup pin
# 2. Update app với new primary pin
# 3. Verify old pin still works (backup)
# 4. Remove old pin after verification
```

### 4. Automated Testing

**iOS Test:**
```swift
func testSSLPinning() {
    let expectation = XCTestExpectation(description: "SSL Pinning Test")
    
    let url = URL(string: "https://pose.sixpilot.technology/api/health")!
    let session = SSLPinningManager.shared.createURLSession()
    
    let task = session.dataTask(with: url) { data, response, error in
        if let error = error {
            XCTFail("SSL Pinning failed: \(error)")
        } else {
            XCTAssertNotNil(data)
        }
        expectation.fulfill()
    }
    
    task.resume()
    wait(for: [expectation], timeout: 10.0)
}
```

**Android Test:**
```kotlin
@Test
fun testSSLPinning() {
    val client = SSLPinningManager(context).createOkHttpClientWithPublicKeyPinning()
    val request = Request.Builder()
        .url("https://pose.sixpilot.technology/api/health")
        .build()
    
    val response = client.newCall(request).execute()
    assertTrue(response.isSuccessful)
}
```

---

## Migration Checklist

Khi triển khai SSL Pinning:

- [ ] Generate/extract SSL certificates
- [ ] Extract public key hashes
- [ ] Configure server HTTPS
- [ ] Add HPKP headers (server)
- [ ] Implement SSL pinning (iOS)
- [ ] Implement SSL pinning (Android)
- [ ] Test với valid certificate
- [ ] Test với invalid certificate
- [ ] Setup certificate expiration monitoring
- [ ] Document pin rotation process
- [ ] Create backup pins
- [ ] Deploy to staging
- [ ] Test trong production environment
- [ ] Monitor pinning failures
- [ ] Update documentation

---

## Tài Liệu Tham Khảo

- [OWASP Certificate Pinning Guide](https://owasp.org/www-community/Controls/Certificate_and_Public_Key_Pinning)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Apple App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [OkHttp CertificatePinner](https://square.github.io/okhttp/4.x/okhttp/okhttp3/-certificate-pinner/)

---

## Kết Luận

SSL Pinning là một kỹ thuật bảo mật quan trọng để bảo vệ ứng dụng khỏi MITM attacks. Tuy nhiên, cần:

1. **Quản lý certificates cẩn thận** - Monitor expiration và rotate đúng cách
2. **Có backup plan** - Luôn có backup pins để tránh downtime
3. **Test thoroughly** - Test trong môi trường development và staging trước khi production
4. **Document everything** - Document process và troubleshooting steps

Với hướng dẫn này, bạn đã có đủ thông tin để triển khai SSL Pinning cho cả server và mobile app.

