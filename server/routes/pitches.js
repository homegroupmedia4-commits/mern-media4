const express = require("express");
const router = express.Router();

const Pitch = require("../models/Pitch");
const PitchCategory = require("../models/PitchCategory");

// GET /api/pitches -> liste (avec catégorie)
// GET /api/pitches?categoryId=...&productId=...
router.get("/", async (req, res) => {
  try {
    const { categoryId, productId } = req.query;

    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (productId) filter.productId = productId;

    const list = await Pitch.find(filter)
      .populate("categoryId", "name isActive")
      .populate("productId", "name isActive")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// POST /api/pitches -> créer
router.post("/", async (req, res) => {
  try {
const { name, codeProduit, dimensions, luminosite, price, categoryId, productId } = req.body;
if (!productId) return res.status(400).json({ message: "Le champ 'productId' est requis." });


    const n = String(name || "").trim();
    const c = String(codeProduit || "").trim();
    const d = String(dimensions || "").trim();
    const l = String(luminosite || "").trim();
    const p = Number(price);

    if (!n) return res.status(400).json({ message: "Le champ 'name' est requis." });
    if (!c) return res.status(400).json({ message: "Le champ 'codeProduit' est requis." });
    if (!d) return res.status(400).json({ message: "Le champ 'dimensions' est requis." });
    if (!l) return res.status(400).json({ message: "Le champ 'luminosite' est requis." });
    if (!Number.isFinite(p)) return res.status(400).json({ message: "Le champ 'price' doit être un nombre." });
    if (!categoryId) return res.status(400).json({ message: "Le champ 'categoryId' est requis." });

    const cat = await PitchCategory.findById(categoryId);
    if (!cat) return res.status(400).json({ message: "Catégorie invalide." });

    const doc = await Pitch.create({
      name: n,
      codeProduit: c,
      dimensions: d,
      luminosite: l,
      price: p,
      categoryId,
        productId,
      isActive: true,
    });

    const populated = await Pitch.findById(doc._id).populate("categoryId", "name isActive");
    res.status(201).json(populated);
  } catch (e) {
    // doublon code produit
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Ce code produit existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/pitches/:id -> rename / toggle / update
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const update = {};

    if (typeof name !== "undefined") {
      const n = String(name || "").trim();
      if (!n) return res.status(400).json({ message: "Le nom ne peut pas être vide." });
      update.name = n;
    }

    if (typeof isActive !== "undefined") {
      update.isActive = !!isActive;
    }

    const doc = await Pitch.findByIdAndUpdate(id, update, { new: true }).populate(
      "categoryId",
      "name isActive"
    );

    if (!doc) return res.status(404).json({ message: "Pitch introuvable." });
    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Conflit (doublon)." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/pitches/:id -> supprimer
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Pitch.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Pitch introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
