const express = require("express");
const router = express.Router();
const ServiceProduct = require("../models/ServiceProduct");
const ServiceFamily = require("../models/ServiceFamily");

// GET /api/service-products?familyId=...
router.get("/", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.familyId) filter.familyId = req.query.familyId;
    const list = await ServiceProduct.find(filter)
      .populate("familyId", "name isActive")
      .sort({ order: 1, createdAt: 1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/service-products/all (admin — tous y compris inactifs)
router.get("/all", async (req, res) => {
  try {
    const list = await ServiceProduct.find()
      .populate("familyId", "name isActive")
      .sort({ order: 1, createdAt: 1 });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/service-products
router.post("/", async (req, res) => {
  try {
    const { familyId, designation, reference, prixUnitaireHt } = req.body || {};
    if (!familyId) return res.status(400).json({ message: "familyId requis." });
    if (!designation || !String(designation).trim()) return res.status(400).json({ message: "designation requise." });
    const prix = Number(prixUnitaireHt);
    if (!Number.isFinite(prix)) return res.status(400).json({ message: "prixUnitaireHt doit être un nombre." });
    const family = await ServiceFamily.findById(familyId);
    if (!family) return res.status(400).json({ message: "Famille invalide." });
    const doc = await ServiceProduct.create({
      familyId,
      designation: String(designation).trim(),
      reference: String(reference || "").trim(),
      prixUnitaireHt: prix,
    });
    const populated = await ServiceProduct.findById(doc._id).populate("familyId", "name isActive");
    res.status(201).json(populated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/service-products/:id
router.patch("/:id", async (req, res) => {
  try {
    const update = {};
    if (req.body.designation !== undefined) {
      const d = String(req.body.designation || "").trim();
      if (!d) return res.status(400).json({ message: "designation ne peut pas être vide." });
      update.designation = d;
    }
    if (req.body.reference !== undefined) update.reference = String(req.body.reference || "").trim();
    if (req.body.prixUnitaireHt !== undefined) {
      const p = Number(req.body.prixUnitaireHt);
      if (!Number.isFinite(p)) return res.status(400).json({ message: "prixUnitaireHt doit être un nombre." });
      update.prixUnitaireHt = p;
    }
    if (req.body.familyId !== undefined) update.familyId = req.body.familyId;
    if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;
    if (req.body.order !== undefined) update.order = Number(req.body.order) || 0;
    const doc = await ServiceProduct.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("familyId", "name isActive");
    if (!doc) return res.status(404).json({ message: "Produit introuvable." });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/service-products/:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await ServiceProduct.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Produit introuvable." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
