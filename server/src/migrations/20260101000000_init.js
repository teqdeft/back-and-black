'use strict';

/**
 * Full schema for the bill-tree MLM platform.
 * All monetary columns are decimal(12,2) in rupees; the engine rounds every
 * arithmetic result to 2 decimals (see lib/money.js) so the ledger stays exact.
 */

exports.up = async function up(knex) {
  // ---- users: owner, staff, and network participants (BA/BP/SE) ----
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('code').notNullable().unique();          // e.g. BA-0000104, S-99
    t.string('name').notNullable();
    t.string('phone');
    t.string('email');
    t.string('password_hash');                          // null => cannot log in
    t.enu('role', ['OWNER', 'STAFF', 'BA', 'BP', 'SE']).notNullable();
    t.integer('sponsor_id').references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamp('first_sale_at');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamps(true, true);
  });

  // ---- products ----
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.string('sku').notNullable().unique();             // e.g. ATNG-0-006
    t.string('name').notNullable();
    t.decimal('price', 12, 2).notNullable().defaultTo(0);
    t.decimal('ba_capacity', 12, 2).notNullable().defaultTo(5000);  // BA cert cap
    t.decimal('bp_capacity', 12, 2).notNullable().defaultTo(2000);  // BP cert cap
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // ---- commission settings (one row per tree level) ----
  await knex.schema.createTable('commission_settings', (t) => {
    t.increments('id').primary();
    t.string('level_key').notNullable().unique();       // SELF, L1, L2, L3, L4, L5
    t.integer('level_index').notNullable();             // 0,1,2,...
    t.decimal('amount', 12, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  // ---- orders: each order is a node (bill_no) in the ternary bill tree ----
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('bill_no').notNullable().unique();        // tree node number (>=1)
    t.string('buyer_name').notNullable();
    t.string('buyer_phone');
    t.string('buyer_city');
    t.string('buyer_state');
    t.text('buyer_address');
    t.integer('product_id').notNullable().references('id').inTable('products');
    t.integer('qty').notNullable().defaultTo(1);
    t.decimal('amount', 12, 2).notNullable().defaultTo(0);
    t.enu('payment_status', ['pending', 'captured', 'failed']).notNullable().defaultTo('pending');
    t.string('payment_ref');
    t.enu('delivery_status', ['paid', 'dispatched', 'delivered', 'cancelled']).notNullable().defaultTo('paid');
    t.string('tracking_id');
    t.integer('ref_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['active', 'cancelled']).notNullable().defaultTo('active');
    t.boolean('commission_distributed').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  // ---- certificates: one per order; the earning container ----
  await knex.schema.createTable('certificates', (t) => {
    t.increments('id').primary();
    t.string('cert_no').notNullable().unique();         // cert_000001
    t.integer('order_id').unique().references('id').inTable('orders').onDelete('CASCADE'); // null for the S-99 sink
    t.integer('bill_no');                               // tree node; null for the S-99 sink
    t.integer('holder_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.enu('holder_role', ['OWNER', 'STAFF', 'BA', 'BP', 'SE']).notNullable();
    t.decimal('capacity', 12, 2).notNullable().defaultTo(0);
    t.decimal('earned', 12, 2).notNullable().defaultTo(0);
    t.enu('status', ['active', 'full']).notNullable().defaultTo('active');
    t.boolean('is_sink').notNullable().defaultTo(false); // S-99 admin overflow sink
    t.timestamp('issued_at').defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['bill_no']);
  });

  // ---- earnings: immutable commission ledger ----
  await knex.schema.createTable('earnings', (t) => {
    t.increments('id').primary();
    t.integer('certificate_id').notNullable().references('id').inTable('certificates').onDelete('CASCADE');
    t.integer('beneficiary_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('source_order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('source_bill_no').notNullable();
    t.string('level_key').notNullable();                // SELF, L1, ...
    t.integer('level_index').notNullable();
    t.decimal('gross_amount', 12, 2).notNullable();     // what this level pays
    t.decimal('credited_amount', 12, 2).notNullable();  // absorbed by this cert
    t.decimal('overflow_amount', 12, 2).notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['certificate_id']);
    t.index(['source_order_id']);
  });

  // ---- monthly settlements / payouts ----
  await knex.schema.createTable('settlements', (t) => {
    t.increments('id').primary();
    t.integer('certificate_id').references('id').inTable('certificates').onDelete('CASCADE');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('period').notNullable();                   // YYYY-MM
    t.decimal('amount', 12, 2).notNullable().defaultTo(0);
    t.enu('status', ['pending', 'exported', 'paid']).notNullable().defaultTo('pending');
    t.string('bank_ref');
    t.timestamps(true, true);
  });

  // ---- role-wise page access control ----
  await knex.schema.createTable('access_control', (t) => {
    t.increments('id').primary();
    t.enu('role', ['BA', 'BP', 'SE']).notNullable();
    t.string('page').notNullable();                     // page key
    t.boolean('locked').notNullable().defaultTo(false);
    t.unique(['role', 'page']);
  });

  // ---- generic key/value app settings (activation rules etc.) ----
  await knex.schema.createTable('app_settings', (t) => {
    t.increments('id').primary();
    t.string('key').notNullable().unique();
    t.text('value');                                    // JSON-encoded
    t.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('app_settings');
  await knex.schema.dropTableIfExists('access_control');
  await knex.schema.dropTableIfExists('settlements');
  await knex.schema.dropTableIfExists('earnings');
  await knex.schema.dropTableIfExists('certificates');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('commission_settings');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('users');
};
