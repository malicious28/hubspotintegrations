const { getTokens, updateTokens } = require('./tokenStore');
const { refreshAccessToken } = require('./hubspot');

const refreshFlights = new Map();

async function ensureFreshToken(connectionId) {
  const tokens = getTokens(connectionId);
  if (!tokens) throw { status: 401, code: 'NOT_CONNECTED' };

  if (tokens.expiresAt > Date.now()) return tokens.accessToken;

  if (refreshFlights.has(connectionId)) {
    await refreshFlights.get(connectionId);
    return getTokens(connectionId).accessToken;
  }

  const promise = (async () => {
    const current = getTokens(connectionId);
    const data = await refreshAccessToken(current.refreshToken);
    updateTokens(connectionId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || current.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
  })().finally(() => refreshFlights.delete(connectionId));

  refreshFlights.set(connectionId, promise);
  await promise;
  return getTokens(connectionId).accessToken;
}

module.exports = { ensureFreshToken };
