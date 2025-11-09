const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Đường dẫn đến certificate
const certPath = process.argv[2] || path.join(__dirname, '..', 'certs', 'server.crt');

try {
  // Kiểm tra file có tồn tại không
  if (!fs.existsSync(certPath)) {
    console.error(`❌ Lỗi: Không tìm thấy file certificate tại: ${certPath}`);
    console.error('\nCách sử dụng:');
    console.error('  node scripts/extract-pin.js [path-to-certificate]');
    console.error('\nVí dụ:');
    console.error('  node scripts/extract-pin.js certs/server.crt');
    process.exit(1);
  }

  // Đọc certificate
  console.log(`📄 Đang đọc certificate từ: ${certPath}\n`);
  const certContent = fs.readFileSync(certPath, 'utf8');
  
  // Nếu là fullchain.pem, chỉ lấy certificate đầu tiên (leaf certificate)
  // Fullchain thường có format: -----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----\n-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----
  let cert = certContent;
  const certMatches = certContent.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
  if (certMatches && certMatches.length > 0) {
    // Lấy certificate đầu tiên (leaf certificate) để pin
    cert = certMatches[0];
    if (certMatches.length > 1) {
      console.log(`ℹ️  Phát hiện ${certMatches.length} certificates trong file. Sử dụng leaf certificate (đầu tiên) để pin.\n`);
    }
  }
  
  // Parse certificate
  const certObj = crypto.createPublicKey(cert);
  const publicKeyDer = certObj.export({ type: 'spki', format: 'der' });
  
  // Tính SHA256 hash
  const hash = crypto.createHash('sha256').update(publicKeyDer).digest('base64');
  
  console.log('='.repeat(60));
  console.log('=== Public Key Pin (SHA256) ===');
  console.log('='.repeat(60));
  console.log(`\npin-sha256="${hash}"\n`);
  
  console.log('='.repeat(60));
  console.log('=== Cấu hình cho app.js ===');
  console.log('='.repeat(60));
  console.log(`const pins = [\n  'pin-sha256="${hash}"',\n];\n`);
  
  console.log('='.repeat(60));
  console.log('=== Cấu hình cho iOS (Swift) ===');
  console.log('='.repeat(60));
  console.log(`let pinnedPublicKeyHashes: [String] = [\n  "${hash}",\n];\n`);
  
  console.log('='.repeat(60));
  console.log('=== Cấu hình cho Android (Kotlin) ===');
  console.log('='.repeat(60));
  console.log(`private val PINNED_PUBLIC_KEY_HASHES = listOf(\n  "sha256/${hash}",\n)\n`);
  
  console.log('='.repeat(60));
  console.log('=== Cấu hình cho Android network_security_config.xml ===');
  console.log('='.repeat(60));
  console.log(`<pin digest="SHA-256">${hash}</pin>\n`);
  
  // Lưu vào file
  const outputDir = path.join(__dirname, '..', 'certs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'pin-hash.txt');
  fs.writeFileSync(outputPath, hash);
  console.log(`📝 Hash đã được lưu vào: ${outputPath}\n`);
  console.log('✅ Hoàn thành! Copy các giá trị trên để sử dụng trong code.\n');
  
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error('\nCó thể do:');
  console.error('  - File certificate không hợp lệ');
  console.error('  - Định dạng certificate không đúng');
  console.error('  - Certificate không phải PEM format');
  console.error('\nCách sử dụng:');
  console.error('  node scripts/extract-pin.js [path-to-certificate]');
  console.error('\nVí dụ:');
  console.error('  node scripts/extract-pin.js certs/server.crt');
  console.error('  node scripts/extract-pin.js /etc/letsencrypt/live/yourdomain.com/fullchain.pem');
  process.exit(1);
}

