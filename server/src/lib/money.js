'use strict';

/** Round to 2 decimal places, avoiding binary float drift. */
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Format a rupee number for display, e.g. 60918.27 -> "₹60,918.27". */
function formatINR(n) {
  return '₹' + round2(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = { round2, formatINR };
