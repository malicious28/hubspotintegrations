const store = new Map();

function setTokens(connectionId, tokens) {
  store.set(connectionId, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });
}

function getTokens(connectionId) {
  return store.get(connectionId) || null;
}

function updateTokens(connectionId, updates) {
  const existing = store.get(connectionId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  store.set(connectionId, updated);
  return updated;
}

module.exports = { store, setTokens, getTokens, updateTokens };
