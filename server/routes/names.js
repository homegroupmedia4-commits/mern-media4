const express = require("express");
const router = express.Router();
const Name = require("../models/Name");

// POST /api/names  -> enregistre un nom
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Le champ 'name' est requis." });
    }

    const doc = await Name.create({ name: String(name).trim() });
    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

router.get("/hello", async (req, res) => {
  try {
    const latest = await Name.findOne().sort({ createdAt: -1 });
    const who = latest?.value || "…";
    res.json({ message: `Bonjour ${who}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// GET /api/names/latest -> renvoie le dernier nom enregistré
router.get("/latest", async (req, res) => {
  try {
    const latest = await Name.findOne().sort({ createdAt: -1 });
    return res.json(latest || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
