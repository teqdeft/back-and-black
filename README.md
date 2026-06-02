# Ashtang Ayurveda — Bill-Tree MLM Platform

A full-stack implementation of a **bill-tree** MLM / commission engine for an
Ayurvedic hair-oil distribution business. Built with **React (Vite)** on the
front end and **Node.js + Express + Knex** on the back end, defaulting to a
zero-setup **SQLite** database (switchable to MySQL/PostgreSQL).

> This is a working foundation that faithfully implements the core engine
> (ternary bill-tree placement, certificate-cap commission accumulation,
> upward overflow, the S-99 admin sink, role access control, settlement
> scaffolding). The original spec lists ~30 open business questions; sensible,
> clearly-documented, admin-configurable defaults are used for each — confirm
> them with the client before going live. See **"Business rules & assumptions"**.

---

## Quick start

Requires **Node.js 18+** (LTS recommended) and npm.

### 1. Backend

```bash
cd server
cp .env.example .env          # optional in dev; defaults work out of the box
npm install                   # compiles better-sqlite3 for your platform
npm run setup                 # runs migrations + seeds demo data
npm run dev                   # API on http://localhost:4000
```

### 2. Frontend (second terminal)

```bash
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

Open **http://localhost:5173** and log in:

| Role        | Identifier   | Password   |
| ----------- | ------------ | ---------- |
| Owner       | `S-99`       | `owner123` |
| Staff       | `STAFF-01`   | `demo1234` |
| Participant | `BA-0000101` | `demo1234` |

The Vite dev server proxies `/api` to the backend, so no CORS setup is needed.

---

## The bill-tree engine

The MLM logic is **bill-tree based, not user-tree based**. Every captured order
becomes a numbered **bill** that is a node in a deterministic ternary tree:

```
Parent(N)   = floor((N - 2) / 3) + 1      (bill #1 is the root)
Children(N) = { 3N - 1, 3N, 3N + 1 }
```

Because a bill's position is a pure function of its number, there is no
placement/spillover ambiguity — the next order always takes the next number.

**Commission distribution** (when an order is captured):

1. Walk the new bill's ancestor chain: `SELF → L1 (parent) → L2 → …`.
2. Each level pays a configurable amount (Settings → Commission).
3. The amount is credited to the **certificate** attached to that ancestor's
   bill, up to the certificate's capacity (BA ₹5,000, BP ₹2,000).
4. Whatever a full certificate can't absorb **overflows upward** to the next
   ancestor's certificate, and finally into the **S-99 admin sink**.

Every credit and overflow hop is written to the immutable `earnings` ledger.

**Verified example** (matches the spec): bill `#18` distributes along
`#18 → #6 → #2 → #1` (SELF ₹70, L1 ₹35, L2 ₹211.11, L3 ₹111.12). The seed data
produces FULL ₹5,000 certificates at the root, exactly like the reference UI.

Run the math test:

```bash
cd server && npm run test:engine     # 1000+ assertions
```

---

## Project structure

```
mlm/
├── server/
│   ├── knexfile.js                 # DB config (sqlite default; mysql2/pg ready)
│   ├── src/
│   │   ├── server.js / app.js      # Express bootstrap + security middleware
│   │   ├── config.js               # env config (fails fast on weak prod secret)
│   │   ├── db.js                   # shared Knex instance
│   │   ├── lib/
│   │   │   ├── billtree.js         # ternary tree math
│   │   │   ├── engine.js           # commission + overflow distribution
│   │   │   ├── orderService.js     # order → bill → certificate → distribute
│   │   │   ├── money.js, codes.js  # helpers
│   │   │   └── engine.test.js      # math assertions
│   │   ├── middleware/             # auth (JWT/RBAC) + error handling
│   │   ├── migrations/             # full schema
│   │   ├── seeds/                  # settings, users, product, 80 sample orders
│   │   └── routes/                 # auth, orders, products, users, certificates, data
└── client/
    └── src/
        ├── lib/      api.js, auth.jsx
        ├── components/ Layout, ui
        └── pages/    Login, Dashboard, Orders, Certificates,
                      Participants, Earnings, BillTree, Products, Settings
```

---

## Switching database

The engine is database-agnostic (everything goes through Knex). To use MySQL:

```bash
cd server
npm install mysql2
# in .env:
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=mlm_hair_oil
npm run setup
```

For PostgreSQL: `npm install pg`, then `DB_CLIENT=pg` and the matching vars.

---

## Security

- **Passwords** hashed with bcrypt; never returned by the API.
- **JWT** auth with role-based authorization (`OWNER`/`STAFF` for admin routes).
  In production, `JWT_SECRET` must be set or the server refuses to boot.
- **SQL injection** — all queries are parameterized via Knex (no string SQL).
- **Input validation** with Zod on every write endpoint.
- **Helmet**, **CORS** allow-list, JSON body-size limit, and **rate limiting**
  (stricter on `/auth/login` to slow brute-force).
- SQLite foreign keys enforced on every connection.

---

## Business rules & assumptions (confirm with client)

| Area | Default chosen | Open question from spec |
| --- | --- | --- |
| L1 commission | ₹35 (editable in Settings) | spec lists ₹35 **or** ₹10 |
| Certificate per order | exactly one | could products generate multiple? |
| Capacity source | per-product (`ba_capacity`/`bp_capacity`) | product-wise overrides? |
| Overflow | bubbles up ancestors, then to S-99 sink | exact S-99 behaviour |
| First-sale tracking | `first_sale_at` recorded on first referred sale | deadline enforcement job not built |
| Settlement | monthly `settlements` table scaffolded | reconciliation workflow TBD |
| Access control | BP/SE locked out of admin pages by default | exact per-role matrix TBD |

**Not yet implemented** (intentionally, pending clarification): automated
activation/deactivation scheduler, withdrawal-request workflow, bank
export/import reconciliation, and the participant self-service portal (the
participant login works but currently lands on the admin console — gate by role
once the participant pages are specified).
```
