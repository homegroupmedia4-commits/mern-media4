const express = require("express");
const router = express.Router();
const MemoryOption = require("../models/MemoryOption");

// GET /api/memory-options
router.get("/", async (req, res) => {
  try {
    const list = await MemoryOption.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/memory-options
router.post("/", async (req, res) => {
  try {
    const { name, price } = req.body;
    const n = String(name || "").trim();
    const p = Number(price);

    if (!n) return res.status(400).json({ message: "Nom requis." });
    if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: "Prix invalide." });

    const doc = await MemoryOption.create({ name: n, price: p, isActive: true });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Ce nom existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/memory-options/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};

    if (typeof req.body.name !== "undefined") {
      const n = String(req.body.name || "").trim();
      if (!n) return res.status(400).json({ message: "Nom invalide." });
      update.name = n;
    }
    if (typeof req.body.price !== "undefined") {
      const p = Number(req.body.price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: "Prix invalide." });
      update.price = p;
    }
    if (typeof req.body.isActive !== "undefined") {
      update.isActive = !!req.body.isActive;
    }

    const doc = await MemoryOption.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Mémoire introuvable." });

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Ce nom existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/memory-options/:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await MemoryOption.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Mémoire introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
