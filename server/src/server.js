'use strict';

const fs = require('fs');
const path = require('path');
const app = require('./app');
const config = require('./config');

// Ensure the SQLite data directory exists before the pool connects.
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`MLM API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
