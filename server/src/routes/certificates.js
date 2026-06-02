'use strict';

const express = require('express');
const db = require('../db');
const { wrap } = require('../middleware/http');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, adminOnly);

// GET /api/certificates?role=&search=&status=
// Returns rows shaped for the Certificates dashboard plus payout summaries.
router.get('/', wrap(async (req, res) => {
  const { role, search, status } = req.query;

  const q = db('certificates as c')
    .leftJoin('users as u', 'u.id', 'c.holder_user_id')
    .leftJoin('orders as o', 'o.id', 'c.order_id')
    .whereNot('c.is_sink', true);

  if (role && ['BA', 'BP', 'SE'].includes(role)) q.where('c.holder_role', role);
  if (status && ['active', 'full'].includes(status)) q.where('c.status', status);
  if (search) {
    const s = `%${search}%`;
    q.where((qb) => qb.where('u.name', 'like', s).orWhere('u.code', 'like', s).orWhere('c.cert_no', 'like', s));
  }

  const rows = await q
    .select(
      'c.id', 'c.cert_no', 'c.bill_no', 'c.capacity', 'c.earned', 'c.status',
      'c.holder_role', 'c.issued_at',
      'u.code as holder_code', 'u.name as holder_name',
      'o.created_at as order_date'
    )
    .orderBy('c.id', 'asc');

  // Summary cards (BA payout / BP payout / grand total of earned).
  const summary = await db('certificates')
    .whereNot('is_sink', true)
    .select('holder_role')
    .sum({ total: 'earned' })
    .groupBy('holder_role');

  const byRole = Object.fromEntries(summary.map((r) => [r.holder_role, Number(r.total) || 0]));
  const grandTotal = Object.values(byRole).reduce((a, b) => a + b, 0);

  res.json({
    rows,
    summary: {
      grand_total: grandTotal,
      ba_payout: byRole.BA || 0,
      bp_payout: byRole.BP || 0,
      se_payout: byRole.SE || 0,
    },
  });
}));

router.get('/:id', wrap(async (req, res) => {
  const cert = await db('certificates as c')
    .leftJoin('users as u', 'u.id', 'c.holder_user_id')
    .where('c.id', req.params.id)
    .select('c.*', 'u.code as holder_code', 'u.name as holder_name')
    .first();
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  const ledger = await db('earnings').where({ certificate_id: cert.id })
    .orderBy('created_at', 'asc');
  res.json({ certificate: cert, ledger });
}));

module.exports = router;
