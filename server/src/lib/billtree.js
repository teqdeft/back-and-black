'use strict';

/**
 * Deterministic ternary bill-tree.
 *
 * The MLM engine is BILL-tree based, not USER-tree based. Every bill (order)
 * is a node whose position is fully determined by its sequential number N.
 *
 *   Parent(N)    = floor((N - 2) / 3) + 1      (root #1 has no parent)
 *   Children(N)  = { 3N - 1, 3N, 3N + 1 }
 *
 * Because position is a pure function of N, there is no "placement" step and
 * no spillover ambiguity: the next bill always takes the next number and lands
 * in a deterministic slot. This keeps the tree balanced and audit-friendly.
 */

/** Parent bill number of N, or null if N is the root (#1) or invalid. */
function parentOf(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n <= 1) return null;
  return Math.floor((n - 2) / 3) + 1;
}

/** The three child bill numbers of N (they may not exist yet). */
function childrenOf(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1) return [];
  return [3 * n - 1, 3 * n, 3 * n + 1];
}

/**
 * Ancestor chain starting at N itself.
 * Returns [{ billNo, level }] where level 0 = SELF, 1 = L1 (parent), etc.
 * Stops at the root, or earlier when maxLevels is reached.
 */
function ancestorChain(n, maxLevels = Infinity) {
  const chain = [];
  let current = Number(n);
  let level = 0;
  while (Number.isInteger(current) && current >= 1 && level <= maxLevels) {
    chain.push({ billNo: current, level });
    const parent = parentOf(current);
    if (parent === null) break;
    current = parent;
    level += 1;
  }
  return chain;
}

/** Depth of node N (root #1 is depth 0). */
function depthOf(n) {
  let depth = 0;
  let current = Number(n);
  while (parentOf(current) !== null) {
    current = parentOf(current);
    depth += 1;
  }
  return depth;
}

/** Map a level index (0..) to its setting key: SELF, L1, L2, ... */
function levelKey(level) {
  return level === 0 ? 'SELF' : `L${level}`;
}

module.exports = { parentOf, childrenOf, ancestorChain, depthOf, levelKey };
