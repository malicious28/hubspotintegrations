const { Router } = require('express');
const { updateTokens, getTokens } = require('../tokenStore');

const router = Router();

router.post('/expire', (req, res) => {
  const { connectionId } = req.body;
  if (!connectionId) return res.status(400).json({ error: 'MISSING_CONNECTION_ID' });

  const tokens = getTokens(connectionId);
  if (!tokens) return res.status(404).json({ error: 'NOT_CONNECTED' });

  updateTokens(connectionId, { expiresAt: 0 });
  res.json({ ok: true, expiresAt: 0, message: 'Token marked as expired' });
});

module.exports = router;
