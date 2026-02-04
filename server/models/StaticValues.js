const mongoose = require("mongoose");

const staticValuesSchema = new mongoose.Schema(
  {
    accessoires_players: { type: Number, default: 800 },
    cout_locaux_chine_france: { type: Number, default: 1000 },
    coeff_leasing: { type: Number, default: 0.7 },
    marge_catalogue: { type: Number, default: 0.7 },
    droits_douane: { type: Number, default: 1.14 },
    taux_eur_usd: { type: Number, default: 1.07 },
    fixation_finition_eur_ml: { type: Number, default: 100 },
    tirage_cable_eur_m2: { type: Number, default: 80 },
    reprise_peinture_eur_m2: { type: Number, default: 100 },
    coffrage_placo_eur_m2: { type: Number, default: 75 },
    raccordement_eur_m2: { type: Number, default: 75 },
    livraison_eur_m2: { type: Number, default: 150 },
    prix_container_eur_m2: { type: Number, default: 150 },
    installation_eur_m2: { type: Number, default: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StaticValues", staticValuesSchema);
