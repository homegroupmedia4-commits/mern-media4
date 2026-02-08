const express = require("express");
const router = express.Router();
const OtherProductSize = require("../models/OtherProductSize");

// GET /api/other-product-sizes
router.get("/", async (req, res) => {
  try {
    // ✅ si ton modèle est passé à productId (ref Product),
    // tu peux récupérer le nom du produit directement
    const list = await OtherProductSize.find()
      .populate("productId", "name isActive")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/other-product-sizes
router.post("/", async (req, res) => {
  try {
    const { sizeInches, productId, leasingMonths, price, productCode } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId requis." });
    }

    const doc = await OtherProductSize.create({
      sizeInches: Number(sizeInches),
      productId,
      leasingMonths: Number(leasingMonths),
      price: Number(price),
      productCode: String(productCode || "").trim(),
      isActive: true,
    });

    const populated = await OtherProductSize.findById(doc._id).populate(
      "productId",
      "name isActive"
    );

    res.status(201).json(populated);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        message: "Doublon (code produit ou combinaison produit/taille/durée).",
      });
    }
    if (e?.name === "ValidationError") {
      return res.status(400).json({ message: "Champs invalides." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/other-product-sizes/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "sizeInches",
      "productId",
      "leasingMonths",
      "price",
      "productCode",
      "isActive",
    ];

    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] !== "undefined") update[k] = req.body[k];
    }

    if (typeof update.sizeInches !== "undefined") update.sizeInches = Number(update.sizeInches);
    if (typeof update.leasingMonths !== "undefined")
      update.leasingMonths = Number(update.leasingMonths);
    if (typeof update.price !== "undefined") update.price = Number(update.price);
    if (typeof update.productCode !== "undefined")
      update.productCode = String(update.productCode || "").trim();
    if (typeof update.isActive !== "undefined") update.isActive = !!update.isActive;

    const doc = await OtherProductSize.findByIdAndUpdate(id, update, { new: true }).populate(
      "productId",
      "name isActive"
    );

    if (!doc) return res.status(404).json({ message: "Ligne introuvable." });

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        message: "Doublon (code produit ou combinaison produit/taille/durée).",
      });
    }
    if (e?.name === "ValidationError") {
      return res.status(400).json({ message: "Champs invalides." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ PUT = alias PATCH (ton front fait PUT)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "sizeInches",
      "productId",
      "leasingMonths",
      "price",
      "productCode",
      "isActive",
    ];

    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] !== "undefined") update[k] = req.body[k];
    }

    if (typeof update.sizeInches !== "undefined") update.sizeInches = Number(update.sizeInches);
    if (typeof update.leasingMonths !== "undefined")
      update.leasingMonths = Number(update.leasingMonths);
    if (typeof update.price !== "undefined") update.price = Number(update.price);
    if (typeof update.productCode !== "undefined")
      update.productCode = String(update.productCode || "").trim();
    if (typeof update.isActive !== "undefined") update.isActive = !!update.isActive;

    const doc = await OtherProductSize.findByIdAndUpdate(id, update, { new: true }).populate(
      "productId",
      "name isActive"
    );

    if (!doc) return res.status(404).json({ message: "Ligne introuvable." });

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        message: "Doublon (code produit ou combinaison produit/taille/durée).",
      });
    }
    if (e?.name === "ValidationError") {
      return res.status(400).json({ message: "Champs invalides." });
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
