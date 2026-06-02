'use strict';

function pad(n, width) {
  return String(n).padStart(width, '0');
}

/** cert_000001 */
function certNo(seq) {
  return `cert_${pad(seq, 6)}`;
}

/** BA-0000104 / BP-0000043 / SE-0000005 */
function userCode(role, seq) {
  return `${role}-${pad(seq, 7)}`;
}

module.exports = { pad, certNo, userCode };
