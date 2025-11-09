const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Script để verify SSL pin hash từ live server
 * So sánh với hash trong code iOS
 */

const DOMAIN = process.argv[2] || 'pose.sixpilot.technology';
const EXPECTED_HASH = process.argv[3] || '6/bXJmxmW9Hf/C05GwFuzH++UG2MmOHoKLqmr9dUowI=';

console.log('='.repeat(70));
console.log('🔒 SSL Pin Verification Tool');
console.log('='.repeat(70));
console.log(`\nDomain: ${DOMAIN}`);
console.log(`Expected Hash: ${EXPECTED_HASH}\n`);

// Method 1: Extract từ live server bằng openssl
console.log('📡 Method 1: Extracting hash from live server...\n');

try {
  const command = `openssl s_client -showcerts -connect ${DOMAIN}:443 -servername ${DOMAIN} < /dev/null 2>/dev/null | openssl x509 -pubkey -noout | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -binary | openssl enc -base64`;
  
  const liveHash = execSync(command, { encoding: 'utf8' }).trim();
  
  console.log(`Live Server Hash: ${liveHash}`);
  console.log(`Expected Hash:    ${EXPECTED_HASH}`);
  
  if (liveHash === EXPECTED_HASH) {
    console.log('\n✅ SUCCESS: Hash khớp! SSL pinning sẽ hoạt động đúng.\n');
  } else {
    console.log('\n❌ MISMATCH: Hash không khớp!');
    console.log('\n⚠️  CẢNH BÁO: SSL pinning sẽ FAIL với hash hiện tại.');
    console.log('\n📝 Cần update hash trong SSLPinningManager.swift:');
    console.log(`   "${liveHash}"`);
    console.log('\n');
  }
} catch (error) {
  console.error('❌ Lỗi khi extract hash từ live server:', error.message);
  console.log('\nTrying Method 2...\n');
}

// Method 2: Sử dụng Node.js https module
console.log('📡 Method 2: Connecting to server via Node.js...\n');

const options = {
  hostname: DOMAIN,
  port: 443,
  path: '/',
  method: 'GET',
  servername: DOMAIN, // SNI
};

const req = https.request(options, (res) => {
  const cert = res.socket.getPeerCertificate(true);
  
  if (!cert || !cert.raw) {
    console.error('❌ Không thể lấy certificate từ server');
    return;
  }
  
  try {
    // Parse certificate
    const certObj = crypto.createPublicKey({
      key: cert.raw,
      format: 'der',
      type: 'spki'
    });
    
    const publicKeyDer = certObj.export({ type: 'spki', format: 'der' });
    const hash = crypto.createHash('sha256').update(publicKeyDer).digest('base64');
    
    console.log(`Live Server Hash: ${hash}`);
    console.log(`Expected Hash:    ${EXPECTED_HASH}`);
    
    if (hash === EXPECTED_HASH) {
      console.log('\n✅ SUCCESS: Hash khớp! SSL pinning sẽ hoạt động đúng.\n');
    } else {
      console.log('\n❌ MISMATCH: Hash không khớp!');
      console.log('\n⚠️  CẢNH BÁO: SSL pinning sẽ FAIL với hash hiện tại.');
      console.log('\n📝 Cần update hash trong SSLPinningManager.swift:');
      console.log(`   "${hash}"`);
      console.log('\n');
    }
    
    // Show certificate info
    console.log('='.repeat(70));
    console.log('📋 Certificate Information:');
    console.log('='.repeat(70));
    console.log(`Subject: ${cert.subject.CN || cert.subject.O || 'N/A'}`);
    console.log(`Issuer: ${cert.issuer.CN || cert.issuer.O || 'N/A'}`);
    console.log(`Valid From: ${cert.valid_from}`);
    console.log(`Valid To: ${cert.valid_to}`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Lỗi khi parse certificate:', error.message);
  }
});

req.on('error', (error) => {
  console.error('❌ Lỗi khi kết nối:', error.message);
  console.log('\n💡 Có thể do:');
  console.log('   - Server không accessible');
  console.log('   - Certificate không hợp lệ');
  console.log('   - Network issue');
});

req.end();

console.log('\n💡 Usage:');
console.log('   node scripts/verify-ssl-pin.js [domain] [expected-hash]');
console.log('   node scripts/verify-ssl-pin.js pose.sixpilot.technology "6/bXJmxmW9Hf/C05GwFuzH++UG2MmOHoKLqmr9dUowI="\n');

