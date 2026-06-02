'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/** Verify the bearer token and attach the live user record to req.user. */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await db('users').where({ id: payload.sub }).first();
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or inactive account' });
    }
    req.user = {
      id: user.id, code: user.code, name: user.name, role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Restrict a route to specific roles. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource' });
    }
    next();
  };
}

const adminOnly = authorize('OWNER', 'STAFF');

module.exports = { authenticate, authorize, adminOnly };
