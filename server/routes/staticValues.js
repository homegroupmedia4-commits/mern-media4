const express = require("express");
const router = express.Router();
const StaticValues = require("../models/StaticValues");

async function getOrCreate() {
  let doc = await StaticValues.findOne();
  if (!doc) {
    doc = await StaticValues.create({});
  } else {
    // ✅ s’assure que les defaults existent si jamais le doc est ancien/incomplet
    doc = await StaticValues.findByIdAndUpdate(doc._id, {}, { new: true, setDefaultsOnInsert: true });
  }
  return doc;
}


// GET /api/static-values
router.get("/", async (req, res) => {
  try {
    const doc = await getOrCreate();
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PATCH /api/static-values (update fields)
router.patch("/", async (req, res) => {
  try {
    const doc = await getOrCreate();

    const allowed = [
      "accessoires_players",
      "cout_locaux_chine_france",
      "coeff_leasing",
      "marge_catalogue",
      "droits_douane",
      "taux_eur_usd",
      "fixation_finition_eur_ml",
      "tirage_cable_eur_m2",
      "reprise_peinture_eur_m2",
      "coffrage_placo_eur_m2",
      "raccordement_eur_m2",
      "livraison_eur_m2",
      "prix_container_eur_m2",
      "installation_eur_m2",
    ];

    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] !== "undefined") {
        const v = Number(req.body[k]);
        if (!Number.isFinite(v)) {
          return res.status(400).json({ message: `Valeur invalide pour ${k}.` });
        }
        update[k] = v;
      }
    }

    const updated = await StaticValues.findByIdAndUpdate(doc._id, update, { new: true });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
