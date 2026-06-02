require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Ensure the SQLite data directory exists (the Knex CLI opens the DB directly).
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// The engine is database-agnostic because every query goes through Knex.
// Default = SQLite (zero-setup, runs immediately). Switch to MySQL/Postgres
// by setting DB_CLIENT + connection vars in .env — no code changes needed.

const client = process.env.DB_CLIENT || 'better-sqlite3';

const base = {
  migrations: { directory: path.join(__dirname, 'src', 'migrations') },
  seeds: { directory: path.join(__dirname, 'src', 'seeds') },
};

const configs = {
  'better-sqlite3': {
    ...base,
    client: 'better-sqlite3',
    connection: { filename: path.join(__dirname, 'data', 'mlm.sqlite3') },
    useNullAsDefault: true,
    pool: {
      // Enforce foreign keys on every SQLite connection.
      afterCreate: (conn, done) => {
        try {
          conn.pragma('foreign_keys = ON');
          done(null, conn);
        } catch (err) {
          done(err, conn);
        }
      },
    },
  },
  mysql2: {
    ...base,
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mlm_hair_oil',
    },
  },
  pg: {
    ...base,
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mlm_hair_oil',
    },
  },
};

const selected = configs[client] || configs['better-sqlite3'];

module.exports = {
  development: selected,
  production: selected,
};
