const { Router } = require('express');
const { store } = require('../tokenStore');

const router = Router();
const startedAt = Date.now();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connectedAccounts: store.size,
    node: process.version,
    ts: new Date().toISOString(),
  });
});

module.exports = router;
