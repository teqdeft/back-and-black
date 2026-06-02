'use strict';

const assert = require('assert');
const { parentOf, childrenOf, ancestorChain, levelKey } = require('./billtree');
const { round2 } = require('./money');

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed++; }
function eq(a, b, msg) { assert.deepStrictEqual(a, b, msg); passed++; }

// --- Children(N) = {3N-1, 3N, 3N+1} ---
eq(childrenOf(1), [2, 3, 4], 'children of #1');
eq(childrenOf(2), [5, 6, 7], 'children of #2');
eq(childrenOf(6), [17, 18, 19], 'children of #6');

// --- Parent(N) = floor((N-2)/3)+1 ---
eq(parentOf(1), null, 'root has no parent');
eq(parentOf(2), 1, 'parent of #2');
eq(parentOf(4), 1, 'parent of #4');
eq(parentOf(5), 2, 'parent of #5');
eq(parentOf(7), 2, 'parent of #7');
eq(parentOf(18), 6, 'parent of #18');
eq(parentOf(6), 2, 'parent of #6');

// --- Spec example: Bill #18 -> #6 -> #2 -> #1 ---
const chain18 = ancestorChain(18).map((n) => n.billNo);
eq(chain18, [18, 6, 2, 1], 'ancestor chain of #18');

// --- level keys ---
eq(levelKey(0), 'SELF', 'level 0 key');
eq(levelKey(3), 'L3', 'level 3 key');

// --- ancestor chain respects maxLevels ---
eq(ancestorChain(18, 2).map((n) => n.billNo), [18, 6, 2], 'chain capped at maxLevels=2');

// --- every node parent/child relationship is consistent ---
for (let n = 2; n <= 1000; n++) {
  const p = parentOf(n);
  ok(childrenOf(p).includes(n), `#${n} is a child of its parent #${p}`);
}

// --- money rounding ---
eq(round2(211.111 + 111.121), 322.23, 'round2 sums cleanly');
eq(round2(0.1 + 0.2), 0.3, 'round2 kills float drift');

// eslint-disable-next-line no-console
console.log(`\n  ✓ engine math: ${passed} assertions passed\n`);
