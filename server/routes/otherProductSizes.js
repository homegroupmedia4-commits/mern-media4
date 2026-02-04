const express = require("express");
const router = express.Router();
const OtherProductSize = require("../models/OtherProductSize");

// GET /api/other-product-sizes
router.get("/", async (req, res) => {
  try {
    const list = await OtherProductSize.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/other-product-sizes
router.post("/", async (req, res) => {
  try {
    const { sizeInches, product, leasingMonths, price, productCode } = req.body;

    const doc = await OtherProductSize.create({
      sizeInches: Number(sizeInches),
      product,
      leasingMonths: Number(leasingMonths),
      price: Number(price),
      productCode: String(productCode || "").trim(),
      isActive: true,
    });

    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Code produit déjà utilisé." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/other-product-sizes/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = ["sizeInches", "product", "leasingMonths", "price", "productCode", "isActive"];
    const update = {};

    for (const k of allowed) {
      if (typeof req.body[k] !== "undefined") update[k] = req.body[k];
    }

    if (typeof update.sizeInches !== "undefined") update.sizeInches = Number(update.sizeInches);
    if (typeof update.leasingMonths !== "undefined") update.leasingMonths = Number(update.leasingMonths);
    if (typeof update.price !== "undefined") update.price = Number(update.price);
    if (typeof update.productCode !== "undefined") update.productCode = String(update.productCode).trim();
    if (typeof update.isActive !== "undefined") update.isActive = !!update.isActive;

    const doc = await OtherProductSize.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Ligne introuvable." });

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Code produit déjà utilisé." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/other-product-sizes/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await OtherProductSize.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Ligne introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
