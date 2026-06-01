// server/routes/leaseurRates.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const LeaseurRate = require("../models/LeaseurRate");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.query?.token || null;
    if (!token) return res.status(401).json({ message: "Non autorisé." });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token invalide." });
    }

    const isAdmin =
      payload?.admin === true ||
      ["admin", "superadmin"].includes(String(payload?.role || ""));
    if (!isAdmin) return res.status(403).json({ message: "Forbidden" });
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

// GET public (sert aux calculs côté agent)
router.get("/", async (req, res) => {
  try {
    const rows = await LeaseurRate.find({}).sort({ months: 1 }).lean();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur (leaseur-rates)." });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { months, taegAnnual } = req.body || {};
    if (!months || Number(months) <= 0) {
      return res.status(400).json({ message: "Durée (months) invalide." });
    }
    const created = await LeaseurRate.create({
      months: Number(months),
      taegAnnual: Number(taegAnnual) || 0,
    });
    res.json(created);
  } catch (e) {
    if (String(e?.code) === "11000")
      return res.status(409).json({ message: "Cette durée existe déjà." });
    console.error(e);
    res.status(500).json({ message: "Erreur création." });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const doc = await LeaseurRate.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Introuvable." });
    if (req.body.taegAnnual !== undefined) doc.taegAnnual = Number(req.body.taegAnnual) || 0;
    if (req.body.months !== undefined) doc.months = Number(req.body.months);
    if (req.body.isActive !== undefined) doc.isActive = !!req.body.isActive;
    await doc.save(); // relance le recalcul auto
    res.json(doc);
  } catch (e) {
    if (String(e?.code) === "11000")
      return res.status(409).json({ message: "Cette durée existe déjà." });
    console.error(e);
    res.status(500).json({ message: "Erreur update." });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await LeaseurRate.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur suppression." });
  }
});

module.exports = router;
