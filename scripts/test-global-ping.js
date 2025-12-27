#!/usr/bin/env node
/**
 * Global Ping Test Script - Detailed Version
 * Test network latency from server to various countries using real public servers
 */

const { exec } = require('child_process');
const os = require('os');

const PING_TARGETS = {
    // USA - DETAILED (using real public servers)
    usa: [
        // Public DNS & CDN (Anycast - reliable)
        { name: 'Google DNS Primary', host: '8.8.8.8', country: 'US', city: 'Anycast' },
        { name: 'Google DNS Secondary', host: '8.8.4.4', country: 'US', city: 'Anycast' },
        { name: 'Cloudflare DNS', host: '1.1.1.1', country: 'US', city: 'Anycast' },
        { name: 'Cloudflare DNS Secondary', host: '1.0.0.1', country: 'US', city: 'Anycast' },
        { name: 'OpenDNS Primary', host: '208.67.222.222', country: 'US', city: 'Anycast' },
        { name: 'OpenDNS Secondary', host: '208.67.220.220', country: 'US', city: 'Anycast' },
        { name: 'Quad9 DNS', host: '9.9.9.9', country: 'US', city: 'Anycast' },
        { name: 'Level3 DNS', host: '4.2.2.2', country: 'US', city: 'Anycast' },
        // Root DNS Servers (distributed globally)
        { name: 'Root DNS A (Verisign)', host: '198.41.0.4', country: 'US', city: 'Multiple' },
        { name: 'Root DNS B (ISI)', host: '199.9.14.201', country: 'US', city: 'Multiple' },
        { name: 'Root DNS D (UMD)', host: '199.7.91.13', country: 'US', city: 'Multiple' },
        { name: 'Root DNS G (DISA)', host: '192.112.36.4', country: 'US', city: 'Multiple' },
        { name: 'Root DNS H (US Army)', host: '198.97.190.53', country: 'US', city: 'Multiple' },
        // Major ISPs/Networks
        { name: 'Comcast DNS', host: '75.75.75.75', country: 'US', city: 'National' },
        { name: 'Verizon DNS', host: '4.2.2.1', country: 'US', city: 'National' },
        { name: 'Sprint DNS', host: '204.117.214.10', country: 'US', city: 'National' },
    ],

    // EUROPE - DETAILED
    europe: [
        // Germany
        { name: 'Germany (dns.watch)', host: '84.200.69.80', country: 'DE', city: 'Germany' },
        { name: 'Germany (dns.watch2)', host: '84.200.70.40', country: 'DE', city: 'Germany' },
        // France
        { name: 'France (FDN)', host: '80.67.169.12', country: 'FR', city: 'Paris' },
        { name: 'France (FDN2)', host: '80.67.169.40', country: 'FR', city: 'Paris' },
        // Netherlands
        { name: 'Netherlands (FreeDNS)', host: '37.235.1.174', country: 'NL', city: 'Amsterdam' },
        { name: 'Netherlands (FreeDNS2)', host: '37.235.1.177', country: 'NL', city: 'Amsterdam' },
        // Switzerland
        { name: 'Switzerland (Xiala)', host: '77.109.148.136', country: 'CH', city: 'Zurich' },
        // Denmark
        { name: 'Denmark (UncensoredDNS)', host: '91.239.100.100', country: 'DK', city: 'Copenhagen' },
        // Russia
        { name: 'Russia (Yandex)', host: '77.88.8.8', country: 'RU', city: 'Moscow' },
        { name: 'Russia (Yandex2)', host: '77.88.8.1', country: 'RU', city: 'Moscow' },
        // Czech
        { name: 'Czech (NIC)', host: '193.17.47.1', country: 'CZ', city: 'Prague' },
        // UK  
        { name: 'UK (Comodo)', host: '8.26.56.26', country: 'UK', city: 'London' },
        // Turkey
        { name: 'Turkey (SafeDNS)', host: '195.46.39.39', country: 'TR', city: 'Turkey' },
    ],

    // ASIA
    asia: [
        // China
        { name: 'China (Alibaba)', host: '223.5.5.5', country: 'CN', city: 'China' },
        { name: 'China (Alibaba2)', host: '223.6.6.6', country: 'CN', city: 'China' },
        { name: 'China (114DNS)', host: '114.114.114.114', country: 'CN', city: 'China' },
        { name: 'China (Baidu)', host: '180.76.76.76', country: 'CN', city: 'China' },
        // Japan
        { name: 'Japan (IIJ)', host: '210.130.0.1', country: 'JP', city: 'Tokyo' },
        // Korea
        { name: 'Korea (KT)', host: '168.126.63.1', country: 'KR', city: 'Seoul' },
        { name: 'Korea (KT2)', host: '168.126.63.2', country: 'KR', city: 'Seoul' },
        // Taiwan
        { name: 'Taiwan (TWNIC)', host: '101.101.101.101', country: 'TW', city: 'Taiwan' },
        // India
        { name: 'India (BSNL)', host: '210.212.97.132', country: 'IN', city: 'India' },
        // Singapore (Cloudflare APAC)
        { name: 'Singapore (Cloudflare APAC)', host: '1.1.1.1', country: 'SG', city: 'Singapore' },
        // Hong Kong
        { name: 'Hong Kong (PCCW)', host: '202.14.67.4', country: 'HK', city: 'Hong Kong' },
    ],

    // OCEANIA
    oceania: [
        { name: 'Australia (Cloudflare)', host: '1.0.0.1', country: 'AU', city: 'Sydney' },
        { name: 'Australia (OpenNIC)', host: '103.236.162.119', country: 'AU', city: 'Australia' },
        { name: 'New Zealand', host: '202.46.190.130', country: 'NZ', city: 'Auckland' },
    ],

    // AMERICAS (non-USA)
    americas: [
        { name: 'Canada (CIRA)', host: '149.112.121.10', country: 'CA', city: 'Canada' },
        { name: 'Brazil (CleanBrowsing)', host: '185.228.168.168', country: 'BR', city: 'Brazil' },
        { name: 'Mexico (Telmex)', host: '200.33.146.245', country: 'MX', city: 'Mexico' },
    ],

    // MIDDLE EAST & AFRICA
    middleeast: [
        { name: 'UAE (du)', host: '142.54.177.77', country: 'AE', city: 'Dubai' },
        { name: 'Israel', host: '195.46.39.40', country: 'IL', city: 'Israel' },
    ],

    africa: [
        { name: 'South Africa', host: '196.15.128.67', country: 'ZA', city: 'South Africa' },
    ],
};

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { count: 3, timeout: 3000, json: false, region: 'all' };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-c' || args[i] === '--count') opts.count = parseInt(args[++i]) || 3;
        else if (args[i] === '-t' || args[i] === '--timeout') opts.timeout = parseInt(args[++i]) || 3000;
        else if (args[i] === '--json') opts.json = true;
        else if (args[i] === '-r' || args[i] === '--region') opts.region = args[++i] || 'all';
        else if (args[i] === '-h' || args[i] === '--help') {
            console.log(`Usage: node test-global-ping.js [options]
Options:
  -c, --count    Pings per host (default: 3)
  -t, --timeout  Timeout ms (default: 3000)
  -r, --region   Region: usa, europe, asia, americas, oceania, middleeast, africa, all
  --json         JSON output`);
            process.exit(0);
        }
    }
    return opts;
}

function ping(host, count, timeout) {
    return new Promise(resolve => {
        const platform = os.platform();
        const timeoutSec = Math.ceil(timeout / 1000);
        const cmd = platform === 'darwin'
            ? `ping -c ${count} -t ${timeoutSec} ${host}`
            : platform === 'win32'
                ? `ping -n ${count} -w ${timeout} ${host}`
                : `ping -c ${count} -W ${timeoutSec} ${host}`;

        exec(cmd, { timeout: timeout * count + 5000 }, (err, stdout) => {
            if (err) return resolve({ success: false, error: err.message });
            const result = { success: true, minMs: null, avgMs: null, maxMs: null };
            const rtt = stdout.match(/min\/avg\/max\/(?:mdev|stddev) = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
            if (rtt) {
                result.minMs = parseFloat(rtt[1]);
                result.avgMs = parseFloat(rtt[2]);
                result.maxMs = parseFloat(rtt[3]);
            }
            result.success = result.avgMs !== null;
            resolve(result);
        });
    });
}

const c = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m', dim: '\x1b[2m', cyan: '\x1b[36m' };
const getColor = ms => ms === null ? c.red : ms < 50 ? c.green : ms < 150 ? c.yellow : c.red;
const fmt = ms => ms === null ? '  ---  ' : `${ms.toFixed(1).padStart(6)}ms`;

async function main() {
    const opts = parseArgs();
    console.log(`\n${c.bold}${c.cyan}🌍 GLOBAL PING TEST${c.reset}\n`);

    let targets = [];
    if (opts.region === 'all') {
        Object.entries(PING_TARGETS).forEach(([region, hosts]) => hosts.forEach(h => targets.push({ ...h, region })));
    } else if (PING_TARGETS[opts.region]) {
        PING_TARGETS[opts.region].forEach(h => targets.push({ ...h, region: opts.region }));
    } else {
        console.error(`Unknown region. Available: ${Object.keys(PING_TARGETS).join(', ')}, all`);
        process.exit(1);
    }

    console.log(`${c.dim}Testing ${targets.length} hosts (${opts.count} pings, ${opts.timeout}ms timeout)${c.reset}\n`);
    const results = [];

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        process.stdout.write(`${c.dim}[${String(i + 1).padStart(2)}/${targets.length}]${c.reset} ${t.name.padEnd(35)} `);
        const r = await ping(t.host, opts.count, opts.timeout);
        results.push({ ...t, ...r });
        if (r.success) {
            console.log(`${getColor(r.avgMs)}${fmt(r.avgMs)}${c.reset} ${c.dim}(${fmt(r.minMs)} - ${fmt(r.maxMs)})${c.reset}`);
        } else {
            console.log(`${c.red}  FAIL  ${c.reset}`);
        }
    }

    // Summary by region
    console.log(`\n${c.bold}${'═'.repeat(80)}${c.reset}`);
    console.log(`${c.bold}${c.cyan} RESULTS BY REGION${c.reset}`);
    console.log(`${c.bold}${'═'.repeat(80)}${c.reset}`);

    const grouped = {};
    results.forEach(r => { if (!grouped[r.region]) grouped[r.region] = []; grouped[r.region].push(r); });

    for (const [region, rs] of Object.entries(grouped)) {
        const successful = rs.filter(x => x.success);
        const avgRegion = successful.length > 0 ? successful.reduce((s, x) => s + x.avgMs, 0) / successful.length : null;
        console.log(`\n${c.bold}▸ ${region.toUpperCase()}${c.reset} ${c.dim}(${successful.length}/${rs.length} successful, avg: ${fmt(avgRegion)})${c.reset}`);

        rs.sort((a, b) => (a.avgMs || 9999) - (b.avgMs || 9999));
        rs.forEach(r => {
            const color = getColor(r.avgMs);
            const status = r.success ? `${color}${fmt(r.avgMs)}${c.reset}` : `${c.red}  FAIL  ${c.reset}`;
            console.log(`   ${r.country.padEnd(3)} ${r.name.padEnd(35)} ${status}`);
        });
    }

    // Overall Summary
    const ok = results.filter(r => r.success);
    const avg = ok.length > 0 ? ok.reduce((s, r) => s + r.avgMs, 0) / ok.length : 0;
    const best = ok.length > 0 ? Math.min(...ok.map(r => r.minMs)) : 0;
    const worst = ok.length > 0 ? Math.max(...ok.map(r => r.maxMs)) : 0;

    console.log(`\n${c.bold}${'═'.repeat(80)}${c.reset}`);
    console.log(`${c.bold}${c.cyan} SUMMARY${c.reset}`);
    console.log(`${c.bold}${'═'.repeat(80)}${c.reset}`);
    console.log(`  Total Tested : ${results.length}`);
    console.log(`  Successful   : ${c.green}${ok.length}${c.reset}`);
    console.log(`  Failed       : ${results.length - ok.length > 0 ? c.red : c.green}${results.length - ok.length}${c.reset}`);
    console.log(`  Avg Latency  : ${getColor(avg)}${avg.toFixed(1)}ms${c.reset}`);
    console.log(`  Best         : ${c.green}${best.toFixed(1)}ms${c.reset}`);
    console.log(`  Worst        : ${c.red}${worst.toFixed(1)}ms${c.reset}`);
    console.log(`\n${c.dim}Legend: ${c.green}●${c.reset} <50ms  ${c.yellow}●${c.reset} <150ms  ${c.red}●${c.reset} >150ms / failed${c.reset}\n`);

    if (opts.json) console.log(JSON.stringify(results, null, 2));

    const report = `/tmp/ping-report-${Date.now()}.json`;
    require('fs').writeFileSync(report, JSON.stringify({
        timestamp: new Date().toISOString(),
        options: opts,
        results,
        summary: { total: results.length, success: ok.length, failed: results.length - ok.length, avgMs: avg, bestMs: best, worstMs: worst }
    }, null, 2));
    console.log(`${c.dim}Report saved: ${report}${c.reset}\n`);
}

main().catch(console.error);
