'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { wrap, validate } = require('../middleware/http');
const { authenticate, adminOnly } = require('../middleware/auth');
const { createOrder } = require('../lib/orderService');

const router = express.Router();
router.use(authenticate, adminOnly);

// GET /api/orders?search=&status=&ref=&page=&pageSize=
router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const { search, status, ref } = req.query;

  const base = db('orders as o')
    .leftJoin('products as p', 'p.id', 'o.product_id')
    .leftJoin('users as u', 'u.id', 'o.ref_user_id');

  if (search) {
    const s = `%${search}%`;
    base.where((qb) => {
      qb.where('o.buyer_name', 'like', s)
        .orWhere('o.buyer_phone', 'like', s)
        .orWhere('o.bill_no', 'like', s)
        .orWhere('o.payment_ref', 'like', s);
    });
  }
  if (status) base.where('o.delivery_status', status);
  if (ref) base.where('u.code', 'like', `%${ref}%`);

  const countRow = await base.clone().count({ c: 'o.id' }).first();
  const total = Number(countRow.c) || 0;

  const rows = await base
    .clone()
    .select(
      'o.*',
      'p.name as product_name', 'p.sku as product_sku',
      'u.code as ref_code', 'u.name as ref_name', 'u.role as ref_role'
    )
    .orderBy('o.bill_no', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({ rows, total, page, pageSize });
}));

router.get('/:id', wrap(async (req, res) => {
  const order = await db('orders as o')
    .leftJoin('products as p', 'p.id', 'o.product_id')
    .leftJoin('users as u', 'u.id', 'o.ref_user_id')
    .where('o.id', req.params.id)
    .select('o.*', 'p.name as product_name', 'p.sku as product_sku',
      'u.code as ref_code', 'u.name as ref_name', 'u.role as ref_role')
    .first();
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const certificate = await db('certificates').where({ order_id: order.id }).first();
  const earnings = await db('earnings').where({ source_order_id: order.id }).orderBy('level_index');
  res.json({ order, certificate, earnings });
}));

const createSchema = z.object({
  buyer_name: z.string().min(1),
  buyer_phone: z.string().optional(),
  buyer_city: z.string().optional(),
  buyer_state: z.string().optional(),
  buyer_address: z.string().optional(),
  product_id: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().positive().default(1),
  ref_user_id: z.coerce.number().int().positive().optional(),
  payment_status: z.enum(['pending', 'captured', 'failed']).default('captured'),
  payment_ref: z.string().optional(),
  delivery_status: z.enum(['paid', 'dispatched', 'delivered', 'cancelled']).default('paid'),
  tracking_id: z.string().optional(),
});

// POST /api/orders  (manual order)
router.post('/', wrap(async (req, res) => {
  const payload = validate(createSchema, req.body);
  const result = await createOrder(payload);
  res.status(201).json(result);
}));

const updateSchema = z.object({
  delivery_status: z.enum(['paid', 'dispatched', 'delivered', 'cancelled']).optional(),
  tracking_id: z.string().optional(),
});

// PATCH /api/orders/:id  (dispatch / tracking updates)
router.patch('/:id', wrap(async (req, res) => {
  const data = validate(updateSchema, req.body);
  const order = await db('orders').where({ id: req.params.id }).first();
  if (!order) return res.status(404).json({ error: 'Order not found' });

  await db('orders').where({ id: order.id }).update({ ...data, updated_at: db.fn.now() });
  const updated = await db('orders').where({ id: order.id }).first();
  res.json({ order: updated });
}));

module.exports = router;
