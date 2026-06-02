"use strict";

const express = require("express");
const { z } = require("zod");
const db = require("../db");
const { wrap, validate } = require("../middleware/http");
const { authenticate, adminOnly } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Anyone authenticated can read the catalogue; only admins mutate it.
router.get(
  "/",
  wrap(async (req, res) => {
    const rows = await db("products").orderBy("id", "asc");
    res.json({ rows });
  }),
);

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  ba_capacity: z.coerce.number().nonnegative().default(5000),
  bp_capacity: z.coerce.number().nonnegative().default(2000),
  active: z.coerce.boolean().default(true),
});

router.post(
  "/",
  adminOnly,
  wrap(async (req, res) => {
    const data = validate(productSchema, req.body);
    const exists = await db("products").where({ sku: data.sku }).first();
    if (exists) return res.status(409).json({ error: "SKU already exists" });
    const [id] = await db("products").insert(data);
    const product = await db("products").where({ id }).first();
    res.status(201).json({ product });
  }),
);

router.patch(
  "/:id",
  adminOnly,
  wrap(async (req, res) => {
    const data = validate(productSchema.partial(), req.body);
    const product = await db("products").where({ id: req.params.id }).first();
    if (!product) return res.status(404).json({ error: "Product not found" });
    await db("products")
      .where({ id: product.id })
      .update({ ...data, updated_at: db.fn.now() });
    const updated = await db("products").where({ id: product.id }).first();
    res.json({ product: updated });
  }),
);

module.exports = router;
