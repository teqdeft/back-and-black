'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { wrap, validate } = require('../middleware/http');
const { authenticate, adminOnly } = require('../middleware/auth');
const { userCode } = require('../lib/codes');

const router = express.Router();
router.use(authenticate, adminOnly);

// GET /api/users?role=&search=
router.get('/', wrap(async (req, res) => {
  const { role, search } = req.query;
  const q = db('users').whereIn('role', ['BA', 'BP', 'SE']);
  if (role) q.where('role', role);
  if (search) {
    const s = `%${search}%`;
    q.where((qb) => qb.where('name', 'like', s).orWhere('code', 'like', s).orWhere('phone', 'like', s));
  }
  const rows = await q.select('id', 'code', 'name', 'role', 'phone', 'email', 'status',
    'sponsor_id', 'first_sale_at', 'joined_at').orderBy('id', 'asc');
  res.json({ rows });
}));

const createSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['BA', 'BP', 'SE']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  sponsor_id: z.coerce.number().int().positive().optional(),
  password: z.string().min(6).optional(),
});

// POST /api/users  (add a participant; the system assigns the next code)
router.post('/', wrap(async (req, res) => {
  const data = validate(createSchema, req.body);

  // Next sequence number within the role.
  const last = await db('users').where({ role: data.role }).orderBy('id', 'desc').first();
  const lastSeq = last ? parseInt(String(last.code).split('-')[1], 10) || 0 : 0;
  const code = userCode(data.role, lastSeq + 1);

  const password_hash = data.password ? await bcrypt.hash(data.password, 10) : null;
  const [id] = await db('users').insert({
    code, name: data.name, role: data.role, phone: data.phone || null,
    email: data.email || null, sponsor_id: data.sponsor_id || null,
    password_hash, status: 'active',
  });
  const user = await db('users').where({ id })
    .select('id', 'code', 'name', 'role', 'phone', 'email', 'status').first();
  res.status(201).json({ user });
}));

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().min(6).optional(),
});

router.patch('/:id', wrap(async (req, res) => {
  const data = validate(updateSchema, req.body);
  const user = await db('users').where({ id: req.params.id }).first();
  if (!user || !['BA', 'BP', 'SE'].includes(user.role)) {
    return res.status(404).json({ error: 'Participant not found' });
  }
  const patch = { ...data, updated_at: db.fn.now() };
  if (data.password) {
    patch.password_hash = await bcrypt.hash(data.password, 10);
    delete patch.password;
  }
  await db('users').where({ id: user.id }).update(patch);
  const updated = await db('users').where({ id: user.id })
    .select('id', 'code', 'name', 'role', 'phone', 'email', 'status').first();
  res.json({ user: updated });
}));

// GET /api/users/:id/affiliate-link
router.get('/:id/affiliate-link', wrap(async (req, res) => {
  const user = await db('users').where({ id: req.params.id }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const base = process.env.PUBLIC_SHOP_URL || 'https://shop.ashtang.test';
  res.json({ link: `${base}/?ref=${encodeURIComponent(user.code)}`, code: user.code });
}));

module.exports = router;
