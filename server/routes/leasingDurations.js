const express = require("express");
const router = express.Router();
const LeasingDuration = require("../models/LeasingDuration");

// GET /api/leasing-durations
router.get("/", async (req, res) => {
  try {
    const list = await LeasingDuration.find().sort({ months: 1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/leasing-durations { months }
router.post("/", async (req, res) => {
  try {
    const months = Number(req.body.months);
    if (!Number.isFinite(months) || months <= 0) {
      return res.status(400).json({ message: "months doit être un nombre > 0." });
    }

    const doc = await LeasingDuration.create({ months });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Cette durée existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/leasing-durations/:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await LeasingDuration.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Durée introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post("/", async (req, res) => {
  try {
    const months = Number(req.body.months);

    if (!Number.isFinite(months) || months <= 0) {
      return res.status(400).json({ message: "months doit être un nombre > 0." });
    }

    // ✅ respecte le modèle
    if (months > 240) {
      return res.status(400).json({ message: "months doit être ≤ 240." });
    }

    const doc = await LeasingDuration.create({ months });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Cette durée existe déjà." });
    }
    if (e?.name === "ValidationError") {
      return res.status(400).json({ message: "Valeur invalide." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


module.exports = router;
