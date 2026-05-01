const { Router } = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { ensureFreshToken } = require('../refreshManager');
const { getContacts } = require('../hubspot');

const router = Router();
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchAllContacts(accessToken) {
  const data = await getContacts(accessToken);
  return data.results || [];
}

router.post('/', async (req, res) => {
  const { connectionId, message } = req.body;

  if (!connectionId) return res.status(400).json({ error: 'MISSING_CONNECTION_ID' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'MISSING_MESSAGE' });

  try {
    let accessToken;
    try {
      accessToken = await ensureFreshToken(connectionId);
    } catch (err) {
      if (err.code === 'NOT_CONNECTED') return res.status(401).json({ error: 'NOT_CONNECTED' });
      throw err;
    }

    const contacts = await fetchAllContacts(accessToken);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a HubSpot CRM assistant. Answer questions concisely about the user's contacts.
Contact data: ${JSON.stringify(contacts)}`,
      messages: [{ role: 'user', content: message.trim() }],
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ error: 'RATE_LIMITED' });
    res.status(err.status || 500).json({ error: err.code || 'SERVER_ERROR' });
  }
});

module.exports = router;
