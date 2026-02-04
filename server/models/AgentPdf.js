// server/models/AgentPdf.js
const mongoose = require("mongoose");

const AgentPdfSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },

    // ✅ Infos client/prospect
    client: {
      nom: { type: String, default: "" },
      prenom: { type: String, default: "" },
      societe: { type: String, default: "" },
      adresse1: { type: String, default: "" },
      adresse2: { type: String, default: "" },
      codePostal: { type: String, default: "" },
      ville: { type: String, default: "" },
      telephone: { type: String, default: "" },
      email: { type: String, default: "" },
      votreEmail: { type: String, default: "" },
      fraisInstallationOfferts: { type: Boolean, default: false },
      fraisParametrageOfferts: { type: Boolean, default: false },
      fraisPortOfferts: { type: Boolean, default: false },
      commentaires: { type: String, default: "" },
    },

    // ✅ Devis meta
    devisNumber: { type: String, default: "" },
    validityDays: { type: Number, default: 30 },

    // ✅ Lignes du tableau (structure “comme CF7” mais en JSON)
    // code, description, qty, puHt, montantHt, tva
    lines: [
      {
        code: String,
        description: String,
        qty: Number,
        puHt: Number,
        montantHt: String, // peut être "OFFERT" donc string
        tva: Number,
      },
    ],

    // ✅ Totaux (comme ton PDF: Mensualité HT / TVA / TTC)
    totals: {
      mensualiteHt: { type: Number, default: 0 },
      totalTva: { type: Number, default: 0 },
      totalTtc: { type: Number, default: 0 },
    },

    // ✅ Mentions (comme ton script devis_mentions)
    devisMentions: { type: String, default: "" },

    // ✅ Pour debug / export
    htmlTable: { type: String, default: "" }, // si tu veux stocker le HTML "html_table" aussi
    apLinesJson: { type: String, default: "" }, // si tu veux stocker ton ap_lines_json aussi

    // ✅ PDF stocké en DB
    pdfBuffer: { type: Buffer, default: null },
    contentType: { type: String, default: "application/pdf" },
    pages: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AgentPdf", AgentPdfSchema);
