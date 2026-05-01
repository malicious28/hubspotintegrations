require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectRoute = require('./routes/connect');
const callbackRoute = require('./routes/callback');
const contactsRoute = require('./routes/contacts');
const chatRoute = require('./routes/chat');
const healthRoute = require('./routes/health');
const statusRoute = require('./routes/status');
const debugRoute = require('./routes/debug');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    process.stdout.write(JSON.stringify({
      route: req.path,
      method: req.method,
      status: res.statusCode,
      partnerStatus: res.getHeader('X-Partner-Status') || null,
      latency: Date.now() - start,
      ts: new Date().toISOString(),
    }) + '\n');
  });
  next();
});

app.use('/connect', connectRoute);
app.use('/callback', callbackRoute);
app.use('/contacts', contactsRoute);
app.use('/chat', chatRoute);
app.use('/health', healthRoute);
app.use('/status', statusRoute);
app.use('/debug', debugRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  process.stdout.write(JSON.stringify({ event: 'server_start', port: PORT }) + '\n');
});
