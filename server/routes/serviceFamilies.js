const express = require("express");
const router = express.Router();
const ServiceFamily = require("../models/ServiceFamily");

// GET /api/service-families
router.get("/", async (req, res) => {
  try {
    const list = await ServiceFamily.find().sort({ order: 1, createdAt: 1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/service-families
router.post("/", async (req, res) => {
  try {
    const { name } = req.body || {};
    const n = String(name || "").trim();
    if (!n) return res.status(400).json({ message: "Le champ 'name' est requis." });
    const doc = await ServiceFamily.create({ name: n });
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/service-families/:id
router.patch("/:id", async (req, res) => {
  try {
    const update = {};
    if (req.body.name !== undefined) {
      const n = String(req.body.name || "").trim();
      if (!n) return res.status(400).json({ message: "Le nom ne peut pas être vide." });
      update.name = n;
    }
    if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;
    if (req.body.order !== undefined) update.order = Number(req.body.order) || 0;
    const doc = await ServiceFamily.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Famille introuvable." });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/service-families/:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await ServiceFamily.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Famille introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
