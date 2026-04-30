const { Router } = require('express');
const crypto = require('crypto');
const { verifyState } = require('../state');
const { exchangeCode } = require('../hubspot');
const { setTokens } = require('../tokenStore');

const router = Router();

router.get('/', async (req, res) => {
  const { code, state } = req.query;

  const payload = verifyState(state);
  if (!payload) return res.status(400).json({ error: 'INVALID_STATE' });

  try {
    const data = await exchangeCode(code, process.env.REDIRECT_URI);
    const connectionId = crypto.randomUUID();

    setTokens(connectionId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    const redirectUrl = new URL(process.env.FRONTEND_URL);
    redirectUrl.searchParams.set('connectionId', connectionId);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'OAUTH_ERROR' });
  }
});

module.exports = router;
