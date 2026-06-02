'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { wrap, validate } = require('../middleware/http');
const { authenticate, adminOnly } = require('../middleware/auth');
const { childrenOf, parentOf } = require('../lib/billtree');

const router = express.Router();
router.use(authenticate);

// ---------- Earnings ledger (admin) ----------
router.get('/earnings', adminOnly, wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
  const q = db('earnings as e')
    .leftJoin('certificates as c', 'c.id', 'e.certificate_id')
    .leftJoin('users as u', 'u.id', 'e.beneficiary_user_id');

  if (req.query.level) q.where('e.level_key', req.query.level);

  const countRow = await q.clone().count({ c: 'e.id' }).first();
  const rows = await q.clone()
    .select('e.*', 'c.cert_no', 'u.code as beneficiary_code', 'u.name as beneficiary_name')
    .orderBy('e.id', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);

  res.json({ rows, total: Number(countRow.c) || 0, page, pageSize });
}));

// ---------- Bill tree (admin) ----------
// GET /api/data/bill-tree?root=1&depth=4  -> nested tree of existing bills
router.get('/bill-tree', adminOnly, wrap(async (req, res) => {
  const root = Math.max(1, parseInt(req.query.root, 10) || 1);
  const depth = Math.min(6, Math.max(1, parseInt(req.query.depth, 10) || 4));

  // Pull all live orders once, index by bill_no, then assemble the subtree.
  const orders = await db('orders as o')
    .leftJoin('certificates as c', 'c.order_id', 'o.id')
    .leftJoin('users as u', 'u.id', 'o.ref_user_id')
    .select('o.bill_no', 'o.buyer_name', 'o.amount',
      'u.code as ref_code', 'u.role as ref_role',
      'c.cert_no', 'c.earned', 'c.capacity', 'c.status')
    .orderBy('o.bill_no', 'asc');
  const byBill = new Map(orders.map((o) => [o.bill_no, o]));

  function build(billNo, level) {
    const node = byBill.get(billNo);
    if (!node) return null;
    const out = {
      bill_no: billNo,
      buyer_name: node.buyer_name,
      ref_code: node.ref_code,
      ref_role: node.ref_role,
      cert_no: node.cert_no,
      earned: Number(node.earned || 0),
      capacity: Number(node.capacity || 0),
      status: node.status,
      children: [],
    };
    if (level < depth) {
      for (const childNo of childrenOf(billNo)) {
        const child = build(childNo, level + 1);
        if (child) out.children.push(child);
      }
    }
    return out;
  }

  res.json({ root, depth, tree: build(root, 0), parent: parentOf(root) });
}));

// ---------- App + commission settings (admin) ----------
router.get('/settings', adminOnly, wrap(async (req, res) => {
  const appRows = await db('app_settings');
  const commission = await db('commission_settings').orderBy('level_index');
  const access = await db('access_control').orderBy(['role', 'page']);
  const app = {};
  for (const r of appRows) {
    try { app[r.key] = JSON.parse(r.value); } catch { app[r.key] = r.value; }
  }
  res.json({ app, commission, access });
}));

const commissionSchema = z.object({
  levels: z.array(z.object({
    level_key: z.string(),
    amount: z.coerce.number().nonnegative(),
  })),
});

router.put('/settings/commission', adminOnly, wrap(async (req, res) => {
  const { levels } = validate(commissionSchema, req.body);
  await db.transaction(async (trx) => {
    for (const lvl of levels) {
      await trx('commission_settings').where({ level_key: lvl.level_key })
        .update({ amount: lvl.amount, updated_at: trx.fn.now() });
    }
  });
  const commission = await db('commission_settings').orderBy('level_index');
  res.json({ commission });
}));

const accessSchema = z.object({
  role: z.enum(['BA', 'BP', 'SE']),
  page: z.string(),
  locked: z.coerce.boolean(),
});

router.put('/settings/access', adminOnly, wrap(async (req, res) => {
  const { role, page, locked } = validate(accessSchema, req.body);
  const row = await db('access_control').where({ role, page }).first();
  if (row) await db('access_control').where({ id: row.id }).update({ locked });
  else await db('access_control').insert({ role, page, locked });
  res.json({ ok: true });
}));

// ---------- Dashboard summary (admin) ----------
router.get('/summary', adminOnly, wrap(async (req, res) => {
  const [{ orders }] = await db('orders').count({ orders: '*' });
  const [{ participants }] = await db('users').whereIn('role', ['BA', 'BP', 'SE']).count({ participants: '*' });
  const [{ certs }] = await db('certificates').whereNot('is_sink', true).count({ certs: '*' });
  const [{ full }] = await db('certificates').whereNot('is_sink', true).where('status', 'full').count({ full: '*' });
  const revRow = await db('orders').where('payment_status', 'captured').sum({ rev: 'amount' }).first();
  const earnRow = await db('certificates').whereNot('is_sink', true).sum({ earned: 'earned' }).first();
  const sinkRow = await db('certificates').where('is_sink', true).sum({ sink: 'earned' }).first();

  res.json({
    orders: Number(orders) || 0,
    participants: Number(participants) || 0,
    certificates: Number(certs) || 0,
    full_certificates: Number(full) || 0,
    revenue: Number(revRow.rev) || 0,
    total_earned: Number(earnRow.earned) || 0,
    admin_sink: Number(sinkRow.sink) || 0,
  });
}));

module.exports = router;
