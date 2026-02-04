const express = require("express");
const router = express.Router();
const PitchCategory = require("../models/PitchCategory");

// GET /api/pitch-categories
router.get("/", async (req, res) => {
  try {
    const list = await PitchCategory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/pitch-categories
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Le champ 'name' est requis." });
    }

    const doc = await PitchCategory.create({
      name: String(name).trim(),
      isActive: true,
    });

    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Cette catégorie existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/pitch-categories/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const update = {};
    if (typeof name !== "undefined") {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Le nom ne peut pas être vide." });
      }
      update.name = String(name).trim();
    }
    if (typeof isActive !== "undefined") {
      update.isActive = !!isActive;
    }

    const doc = await PitchCategory.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Catégorie introuvable." });

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Ce nom existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/pitch-categories/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PitchCategory.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Catégorie introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
