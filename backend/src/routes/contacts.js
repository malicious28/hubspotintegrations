const { Router } = require('express');
const { ensureFreshToken } = require('../refreshManager');
const { updateTokens } = require('../tokenStore');
const { getContacts } = require('../hubspot');

const router = Router();

router.get('/', async (req, res) => {
  const { connectionId, after } = req.query;

  if (!connectionId) return res.status(400).json({ error: 'MISSING_CONNECTION_ID' });

  try {
    let accessToken;
    try {
      accessToken = await ensureFreshToken(connectionId);
    } catch (err) {
      if (err.code === 'NOT_CONNECTED') return res.status(401).json({ error: 'NOT_CONNECTED' });
      throw err;
    }

    let data;
    try {
      data = await getContacts(accessToken, after);
    } catch (err) {
      if (err.status !== 401) throw err;

      // Force expiry and retry once
      updateTokens(connectionId, { expiresAt: 0 });
      try {
        accessToken = await ensureFreshToken(connectionId);
        data = await getContacts(accessToken, after);
      } catch (retryErr) {
        if (retryErr.status === 401 || retryErr.code === 'REFRESH_FAILED') {
          return res.status(401).json({ error: 'REFRESH_FAILED' });
        }
        throw retryErr;
      }
    }

    res.json({ contacts: data.results, pagination: data.paging || null });
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ error: 'RATE_LIMITED' });
    res.status(err.status || 500).json({ error: err.code || 'SERVER_ERROR' });
  }
});

module.exports = router;
