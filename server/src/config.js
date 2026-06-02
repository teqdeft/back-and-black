'use strict';

require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-only-change-me-in-production') {
  // Fail fast rather than run with a known secret in production.
  throw new Error('JWT_SECRET must be set to a strong value in production.');
}

module.exports = config;
