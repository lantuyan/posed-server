const express = require('express');
const path = require('path');

const router = express.Router();

const staticDir = path.join(__dirname, '..', 'static');

router.get('/policy', (req, res) => {
  res.sendFile(path.join(staticDir, 'policy.html'));
});

router.get('/term', (req, res) => {
  res.sendFile(path.join(staticDir, 'term.html'));
});

router.get('/app-ads.txt', (req, res) => {
  res.type('text/plain').send('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
});

module.exports = router;

