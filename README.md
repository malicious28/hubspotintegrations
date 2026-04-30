# HubSpot OAuth Connector

A production-ready HubSpot OAuth integration built with Node.js and React. Authenticates via OAuth 2.0, stores tokens in memory, and fetches CRM contacts with automatic token refresh.

**Live URL:** _coming soon after deployment_

---

## Stack

- **Backend** — Node.js, Express
- **Frontend** — React, TypeScript, Vite
- **Storage** — In-memory Map (no database)

---

## Setup

### Prerequisites
- Node.js 18+
- A HubSpot developer app with `crm.objects.contacts.read` scope

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your HubSpot credentials in .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

**backend/.env**
```
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:3000/callback
FRONTEND_URL=http://localhost:5173
STATE_SECRET=a_random_32_plus_character_string
PORT=3000
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3000
```

---

## How Single-Flight Refresh Works

When an access token expires, concurrent requests to `/contacts` could each trigger a separate refresh call to HubSpot — wasteful and potentially rate-limited. Instead, the first request that detects an expired token initiates a refresh and stores its Promise in a `Map<connectionId, Promise>`. Every subsequent concurrent request finds that Promise already in the map and awaits it directly, rather than starting a new one. Once the refresh resolves, all waiting requests proceed with the new token. The map entry is deleted when the Promise settles, so future requests start fresh.

---

## What I'd Add Next

- **Persistent storage** — swap the in-memory Map for Redis or a database so tokens survive server restarts
- **Multi-account support** — associate connections with user sessions
- **Webhook ingestion** — receive real-time CRM updates from HubSpot
- **Rate limit backoff** — exponential retry on 429 responses

---

## Notes

Built in approximately 3–4 hours. If this were day one on the job, the first thing I'd ship is persistent token storage — an in-memory store works for demos but loses all connections on every deploy, which would be a critical failure in any production environment.
