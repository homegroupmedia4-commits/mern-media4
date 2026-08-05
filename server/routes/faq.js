const express = require("express");
const router = express.Router();
const FaqItem = require("../models/FaqItem");

// GET public (agent)
router.get("/", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.role) {
      filter.role = { $in: [req.query.role, "tous"] };
    }
    const items = await FaqItem.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET admin (tous)
router.get("/admin", async (req, res) => {
  try {
    const items = await FaqItem.find().sort({ order: 1, createdAt: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST admin
router.post("/", async (req, res) => {
  try {
    const item = await FaqItem.create(req.body);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT admin
router.put("/:id", async (req, res) => {
  try {
    const item = await FaqItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: "Introuvable." });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE admin
router.delete("/:id", async (req, res) => {
  try {
    await FaqItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
