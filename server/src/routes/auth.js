'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const { wrap, validate } = require('../middleware/http');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  identifier: z.string().min(1), // code, email, or phone
  password: z.string().min(1),
});

router.post('/login', wrap(async (req, res) => {
  const { identifier, password } = validate(loginSchema, req.body);

  const user = await db('users')
    .where({ code: identifier })
    .orWhere({ email: identifier })
    .orWhere({ phone: identifier })
    .first();

  // Constant-ish response to avoid leaking which identifiers exist.
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.json({
    token,
    user: { id: user.id, code: user.code, name: user.name, role: user.role },
  });
}));

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
