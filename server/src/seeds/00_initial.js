// 'use strict';

// const bcrypt = require('bcryptjs');

// // Pages that can be locked per role in the access-control matrix.
// const PAGES = [
//   'dashboard', 'orders', 'earnings', 'my_earnings', 'certificates',
//   'affiliate_links', 'network_tree', 'bill_tree', 'products', 'settings',
// ];

// /**
//  * FRESH-START SEED
//  * Seeds only what the system needs to run on a clean slate:
//  *   - 3 login profiles: Owner (S-99), BA-0000001, BP-0000001
//  *   - the S-99 overflow sink certificate (internal plumbing, hidden in the UI)
//  *   - commission rates, access-control matrix, app settings (configuration)
//  *   - one product so orders can be placed
//  * No orders, certificates or earnings are created.
//  */
// exports.seed = async function seed(knex) {
//   // --- clear everything in FK-safe order ---
//   await knex('earnings').del();
//   await knex('settlements').del();
//   await knex('certificates').del();
//   await knex('orders').del();
//   await knex('commission_settings').del();
//   await knex('access_control').del();
//   await knex('app_settings').del();
//   await knex('products').del();
//   await knex('users').del();

//   // --- app settings (activation rules + general config) ---
//   const settings = {
//     brand_name: 'Ashtang Ayurveda',
//     max_commission_levels: 5,
//     first_sale_deadline_days: 30,
//     monthly_min_sales: 1,
//     currency: 'INR',
//     l1_note: 'L1 commission is configurable; spec lists 35 or 10 pending client confirmation.',
//   };
//   await knex('app_settings').insert(
//     Object.entries(settings).map(([key, value]) => ({ key, value: JSON.stringify(value) }))
//   );

//   // --- commission levels (rupees) — editable in Settings ---
//   await knex('commission_settings').insert([
//     { level_key: 'SELF', level_index: 0, amount: 70 },
//     { level_key: 'L1', level_index: 1, amount: 35 },
//     { level_key: 'L2', level_index: 2, amount: 211.11 },
//     { level_key: 'L3', level_index: 3, amount: 111.12 },
//     { level_key: 'L4', level_index: 4, amount: 2 },
//     { level_key: 'L5', level_index: 5, amount: 2 },
//   ]);

//   // --- one product so orders can be placed (edit/replace in Products) ---
//   await knex('products').insert({
//     sku: 'ATNG-0-006',
//     name: 'Ashtang Ayurvedic Hair Oil (200ml)',
//     price: 730,
//     ba_capacity: 5000,
//     bp_capacity: 2000,
//     active: true,
//   });

//   // --- 3 login profiles: Owner, BA, BP (no orders/certificates/earnings) ---
//   const ownerHash = await bcrypt.hash('owner123', 10);
//   const demoHash = await bcrypt.hash('demo1234', 10);

//   const [ownerId] = await knex('users').insert({
//     code: 'S-99', name: 'Shri Ashtang', role: 'OWNER',
//     email: 'owner@ashtang.test', phone: '9000000099',
//     password_hash: ownerHash, status: 'active',
//   });

//   await knex('users').insert({
//     code: 'BA-0000001', name: 'Demo Brand Ambassador', role: 'BA',
//     email: 'ba@ashtang.test', phone: '9000000010',
//     password_hash: demoHash, status: 'active', sponsor_id: ownerId,
//   });

//   await knex('users').insert({
//     code: 'BP-0000001', name: 'Demo Brand Promoter', role: 'BP',
//     email: 'bp@ashtang.test', phone: '9000000020',
//     password_hash: demoHash, status: 'active', sponsor_id: ownerId,
//   });

//   // --- S-99 admin overflow sink (a certificate with no tree node) ---
//   await knex('certificates').insert({
//     cert_no: 'S99-SINK', order_id: null, bill_no: null,
//     holder_user_id: ownerId, holder_role: 'OWNER',
//     capacity: 0, earned: 0, status: 'active', is_sink: true,
//   });

//   // --- access control matrix (sensible defaults; tune in Settings) ---
//   const acl = [];
//   for (const role of ['BA', 'BP', 'SE']) {
//     for (const page of PAGES) {
//       const adminPages = ['orders', 'products', 'settings', 'network_tree', 'bill_tree'];
//       acl.push({ role, page, locked: adminPages.includes(page) });
//     }
//   }
//   await knex('access_control').insert(acl);

//   // eslint-disable-next-line no-console
//   console.log('Fresh seed: 3 logins (Owner S-99, BA-0000001, BP-0000001), 1 product, commission config. No orders/certificates/earnings.');
// };



'use strict';

const bcrypt = require('bcryptjs');

// Pages that can be locked per role in the access-control matrix.
const PAGES = [
  'dashboard', 'orders', 'earnings', 'my_earnings', 'certificates',
  'affiliate_links', 'network_tree', 'bill_tree', 'products', 'settings',
];

/**
 * FRESH-START SEED
 * Seeds only what the system needs to run on a clean slate:
 *   - 3 login profiles: Owner (S-99), BA-0000001, BP-0000001
 *   - the S-99 overflow sink certificate (internal plumbing, hidden in the UI)
 *   - commission rates, access-control matrix, app settings (configuration)
 *   - one product so orders can be placed
 * No orders, certificates or earnings are created.
 */
exports.seed = async function seed(knex) {
  // --- clear everything in FK-safe order ---
  await knex('earnings').del();
  await knex('settlements').del();
  await knex('certificates').del();
  await knex('orders').del();
  await knex('commission_settings').del();
  await knex('access_control').del();
  await knex('app_settings').del();
  await knex('products').del();
  await knex('users').del();

  // --- app settings (activation rules + general config) ---
  const settings = {
    brand_name: 'Ashtang Ayurveda',
    max_commission_levels: 5,
    first_sale_deadline_days: 30,
    monthly_min_sales: 1,
    currency: 'INR',
    l1_note: 'L1 commission is configurable; spec lists 35 or 10 pending client confirmation.',
  };
  await knex('app_settings').insert(
    Object.entries(settings).map(([key, value]) => ({ key, value: JSON.stringify(value) }))
  );

  // --- commission levels (rupees) — editable in Settings ---
  await knex('commission_settings').insert([
    { level_key: 'SELF', level_index: 0, amount: 70 },
    { level_key: 'L1', level_index: 1, amount: 35 },
    { level_key: 'L2', level_index: 2, amount: 211.11 },
    { level_key: 'L3', level_index: 3, amount: 111.12 },
    { level_key: 'L4', level_index: 4, amount: 2 },
    { level_key: 'L5', level_index: 5, amount: 2 },
  ]);

  // --- one product so orders can be placed (edit/replace in Products) ---
  await knex('products').insert({
    sku: 'ATNG-0-006',
    name: 'Ashtang Ayurvedic Hair Oil (200ml)',
    price: 730,
    ba_capacity: 5000,
    bp_capacity: 2000,
    active: true,
  });

  // --- 3 login profiles: Owner, BA, BP (no orders/certificates/earnings) ---
  const ownerHash = await bcrypt.hash('owner123', 10);
  const demoHash = await bcrypt.hash('demo1234', 10);

  const [ownerId] = await knex('users').insert({
    code: 'S-99', name: 'Shri Ashtang', role: 'OWNER',
    email: 'owner@ashtang.test', phone: '9000000099',
    password_hash: ownerHash, status: 'active',
  });

  await knex('users').insert({
    code: 'BA-0000001', name: 'Demo Brand Ambassador', role: 'BA',
    email: 'ba@ashtang.test', phone: '9000000010',
    password_hash: demoHash, status: 'active', sponsor_id: ownerId,
  });

  await knex('users').insert({
    code: 'BP-0000001', name: 'Demo Brand Promoter', role: 'BP',
    email: 'bp@ashtang.test', phone: '9000000020',
    password_hash: demoHash, status: 'active', sponsor_id: ownerId,
  });

  // --- S-99 admin overflow sink (a certificate with no tree node) ---
  await knex('certificates').insert({
    cert_no: 'S99-SINK', order_id: null, bill_no: null,
    holder_user_id: ownerId, holder_role: 'OWNER',
    capacity: 0, earned: 0, status: 'active', is_sink: true,
  });

  // --- access control matrix (sensible defaults; tune in Settings) ---
  const acl = [];
  for (const role of ['BA', 'BP', 'SE']) {
    for (const page of PAGES) {
      const adminPages = ['orders', 'products', 'settings', 'network_tree', 'bill_tree'];
      acl.push({ role, page, locked: adminPages.includes(page) });
    }
  }
  await knex('access_control').insert(acl);

  // eslint-disable-next-line no-console
  console.log('Fresh seed: 3 logins (Owner S-99, BA-0000001, BP-0000001), 1 product, commission config. No orders/certificates/earnings.');
};
