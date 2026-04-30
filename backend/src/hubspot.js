const BASE = 'https://api.hubapi.com';
const TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

async function exchangeCode(code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, code: 'TOKEN_EXCHANGE_FAILED', message: err.message };
  }
  return res.json();
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, code: 'REFRESH_FAILED', message: err.message };
  }
  return res.json();
}

async function getContacts(accessToken, after) {
  const url = new URL(`${BASE}/crm/v3/objects/contacts`);
  url.searchParams.set('limit', '25');
  url.searchParams.set('properties', 'firstname,lastname,email');
  if (after) url.searchParams.set('after', after);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw { status: 401, code: 'UNAUTHORIZED' };
  if (res.status === 429) throw { status: 429, code: 'RATE_LIMITED' };
  if (!res.ok) throw { status: res.status, code: 'HUBSPOT_ERROR' };

  return res.json();
}

module.exports = { exchangeCode, refreshAccessToken, getContacts };
