const { Router } = require('express');
const crypto = require('crypto');
const { signState } = require('../state');

const router = Router();

router.get('/', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = signState({ nonce, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'crm.objects.contacts.read',
    state,
  });

  const authorizeUrl = `https://app.hubspot.com/oauth/authorize?${params}`;
  res.json({ authorizeUrl });
});

module.exports = router;
