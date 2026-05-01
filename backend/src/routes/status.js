const { Router } = require('express');
const { getTokens } = require('../tokenStore');

const router = Router();

router.get('/', (req, res) => {
  const { connectionId } = req.query;
  if (!connectionId) return res.status(400).json({ error: 'MISSING_CONNECTION_ID' });

  const tokens = getTokens(connectionId);
  if (!tokens) return res.json({ connected: false });

  res.set('Cache-Control', 'no-store');
  res.json({
    connected: true,
    expiresAt: tokens.expiresAt,
    expired: tokens.expiresAt <= Date.now(),
  });
});

module.exports = router;
