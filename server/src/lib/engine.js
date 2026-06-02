'use strict';

const { ancestorChain, levelKey } = require('./billtree');
const { round2 } = require('./money');

/**
 * COMMISSION + CERTIFICATE ENGINE
 * --------------------------------
 * When an order's payment is captured, it becomes a live bill in the ternary
 * tree and triggers a single distribution event:
 *
 *   1. Walk the ancestor chain of the new bill: SELF, L1 (parent), L2, ...
 *   2. For each level, look up the configured commission amount.
 *   3. Credit that amount to the CERTIFICATE attached to that ancestor's bill.
 *   4. Certificates have a capacity (BA ₹5000, BP ₹2000). A certificate only
 *      absorbs up to its remaining room; anything left OVERFLOWS UPWARD to the
 *      next ancestor's certificate, and so on. If it reaches the top with money
 *      still unabsorbed, it lands in the S-99 admin sink (unlimited capacity).
 *
 * Every credit and every overflow hop is written to the immutable `earnings`
 * ledger, so the whole flow is auditable.
 *
 * All DB work happens inside one transaction (`trx`) supplied by the caller,
 * so a failure rolls the whole distribution back.
 */

/**
 * Credit `amount` to the certificate for `billNo`, bubbling overflow upward.
 * Returns the total amount that was successfully absorbed somewhere.
 */
async function creditWithOverflow(trx, {
  startBillNo,
  amount,
  levelKeyStr,
  levelIndex,
  sourceOrderId,
  sourceBillNo,
  sinkCertId,
  maxLevels,
}) {
  let remaining = round2(amount);
  if (remaining <= 0) return 0;

  // The chain of bills that can receive this money, walking upward from the
  // level's target bill toward the root.
  const chain = ancestorChain(startBillNo, maxLevels);
  let absorbedTotal = 0;

  for (const node of chain) {
    if (remaining <= 0) break;

    const cert = await trx('certificates').where({ bill_no: node.billNo }).first();
    if (!cert) continue; // no certificate on that bill yet

    const room = cert.is_sink ? Infinity : round2(cert.capacity - cert.earned);
    if (room <= 0) continue; // full — skip to next ancestor

    const credit = cert.is_sink ? remaining : round2(Math.min(remaining, room));
    const overflow = round2(remaining - credit);
    const newEarned = round2(cert.earned + credit);

    await trx('certificates').where({ id: cert.id }).update({
      earned: newEarned,
      status: !cert.is_sink && newEarned >= cert.capacity ? 'full' : cert.status,
      updated_at: trx.fn.now(),
    });

    await trx('earnings').insert({
      certificate_id: cert.id,
      beneficiary_user_id: cert.holder_user_id,
      source_order_id: sourceOrderId,
      source_bill_no: sourceBillNo,
      level_key: levelKeyStr,
      level_index: levelIndex,
      gross_amount: round2(amount),
      credited_amount: credit,
      overflow_amount: overflow,
    });

    absorbedTotal = round2(absorbedTotal + credit);
    remaining = overflow;
  }

  // Anything still unabsorbed after the root goes to the S-99 admin sink.
  if (remaining > 0 && sinkCertId) {
    const sink = await trx('certificates').where({ id: sinkCertId }).first();
    if (sink) {
      await trx('certificates').where({ id: sink.id }).update({
        earned: round2(sink.earned + remaining),
        updated_at: trx.fn.now(),
      });
      await trx('earnings').insert({
        certificate_id: sink.id,
        beneficiary_user_id: sink.holder_user_id,
        source_order_id: sourceOrderId,
        source_bill_no: sourceBillNo,
        level_key: levelKeyStr,
        level_index: levelIndex,
        gross_amount: round2(amount),
        credited_amount: remaining,
        overflow_amount: 0,
      });
      absorbedTotal = round2(absorbedTotal + remaining);
      remaining = 0;
    }
  }

  return absorbedTotal;
}

/**
 * Distribute commission for one freshly-captured order/bill.
 * Idempotent: if the order is already flagged commission_distributed it no-ops.
 */
async function distributeCommission(trx, order) {
  if (order.commission_distributed) return { skipped: true };

  // Load configured commission per level, indexed by level_index.
  const settings = await trx('commission_settings').orderBy('level_index', 'asc');
  const byLevel = new Map(settings.map((s) => [s.level_index, Number(s.amount)]));
  const maxLevels = settings.length ? Math.max(...settings.map((s) => s.level_index)) : 0;

  // The admin overflow sink (S-99 owner certificate).
  const sinkCert = await trx('certificates').where({ is_sink: true }).first();
  const sinkCertId = sinkCert ? sinkCert.id : null;

  // For each level, the commission targets the ancestor bill at that level,
  // then bubbles up from there if that certificate is full.
  const chain = ancestorChain(order.bill_no, maxLevels);
  const events = [];

  for (const node of chain) {
    const amount = byLevel.get(node.level) || 0;
    if (amount <= 0) continue;
    const absorbed = await creditWithOverflow(trx, {
      startBillNo: node.billNo,
      amount,
      levelKeyStr: levelKey(node.level),
      levelIndex: node.level,
      sourceOrderId: order.id,
      sourceBillNo: order.bill_no,
      sinkCertId,
      maxLevels,
    });
    events.push({ level: levelKey(node.level), billNo: node.billNo, amount, absorbed });
  }

  await trx('orders').where({ id: order.id }).update({
    commission_distributed: true,
    updated_at: trx.fn.now(),
  });

  return { skipped: false, events };
}

module.exports = { distributeCommission, creditWithOverflow };
