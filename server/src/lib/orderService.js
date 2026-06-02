'use strict';

const db = require('../db');
const { certNo } = require('./codes');
const { round2 } = require('./money');
const { distributeCommission } = require('./engine');

/** Capacity for a certificate held by `role`, taken from the product config. */
function capacityFor(role, product) {
  if (role === 'BP') return Number(product.bp_capacity);
  if (role === 'OWNER') return 0; // sink overrides; non-sink owner certs are 0-room
  return Number(product.ba_capacity); // BA / SE default to BA capacity
}

/**
 * Create an order (a new bill in the tree), issue its certificate, and — when
 * the payment is captured — run commission distribution. All in one txn.
 *
 * payload: {
 *   buyer_name, buyer_phone, buyer_city, buyer_state, buyer_address,
 *   product_id, qty, ref_user_id, payment_status, payment_ref,
 *   delivery_status, tracking_id
 * }
 */
async function createOrder(payload) {
  return db.transaction(async (trx) => {
    const product = await trx('products').where({ id: payload.product_id }).first();
    if (!product) throw new httpError(400, 'Invalid product');
    if (!product.active) throw new httpError(400, 'Product is not active');

    const qty = Math.max(1, parseInt(payload.qty, 10) || 1);
    const amount = round2(Number(product.price) * qty);

    // Next sequential bill number = next tree node.
    const maxRow = await trx('orders').max({ m: 'bill_no' }).first();
    const billNo = (maxRow && maxRow.m ? Number(maxRow.m) : 0) + 1;

    // Resolve the referring participant (defaults to OWNER / S-99 house order).
    let ref = null;
    if (payload.ref_user_id) {
      ref = await trx('users').where({ id: payload.ref_user_id }).first();
    }
    if (!ref) {
      ref = await trx('users').where({ role: 'OWNER' }).orderBy('id', 'asc').first();
    }

    const paymentStatus = ['pending', 'captured', 'failed'].includes(payload.payment_status)
      ? payload.payment_status
      : 'captured';

    const [orderId] = await trx('orders').insert({
      bill_no: billNo,
      buyer_name: payload.buyer_name,
      buyer_phone: payload.buyer_phone || null,
      buyer_city: payload.buyer_city || null,
      buyer_state: payload.buyer_state || null,
      buyer_address: payload.buyer_address || null,
      product_id: product.id,
      qty,
      amount,
      payment_status: paymentStatus,
      payment_ref: payload.payment_ref || null,
      delivery_status: ['paid', 'dispatched', 'delivered', 'cancelled'].includes(payload.delivery_status)
        ? payload.delivery_status
        : 'paid',
      tracking_id: payload.tracking_id || null,
      ref_user_id: ref.id,
      status: 'active',
    });

    // One certificate per order, held by the referring participant.
    // Owner ("house") orders get a 0-room certificate, so their commission
    // simply passes upward; the single dedicated S-99 sink (seeded) catches
    // anything that overflows past the root.
    const capacity = ref.role === 'OWNER' ? 0 : capacityFor(ref.role, product);

    // Certificate sequence number tracks issued order-certificates (cert_000001..).
    const orderCertRow = await trx('certificates').whereNotNull('order_id').count({ c: '*' }).first();
    const seq = (Number(orderCertRow.c) || 0) + 1;

    const [certificateId] = await trx('certificates').insert({
      cert_no: certNo(seq),
      order_id: orderId,
      bill_no: billNo,
      holder_user_id: ref.id,
      holder_role: ref.role,
      capacity,
      earned: 0,
      status: 'active',
      is_sink: false,
    });

    // Mark the participant's first sale (used by activation rules).
    if (!ref.first_sale_at && ref.role !== 'OWNER') {
      await trx('users').where({ id: ref.id }).update({ first_sale_at: trx.fn.now() });
    }

    // Distribute commission only when money was actually captured.
    const order = await trx('orders').where({ id: orderId }).first();
    let distribution = { skipped: true };
    if (order.payment_status === 'captured') {
      distribution = await distributeCommission(trx, order);
    }

    return { orderId, certificateId, billNo, distribution };
  });
}

/** Small helper to throw HTTP-aware errors from services. */
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { createOrder, capacityFor };
