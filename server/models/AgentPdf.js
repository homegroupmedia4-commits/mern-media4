// server/models/AgentPdf.js
const mongoose = require("mongoose");

// ✅ Sous-schema pour une ligne (autorise "/" "-" "OFFERT" + nombres)
const LineSchema = new mongoose.Schema(
  {
    code: { type: String, default: "" },
    description: { type: String, default: "" },

    // ✅ IMPORTANT: Mixed car tu mets "/" et aussi des nombres
    qty: { type: mongoose.Schema.Types.Mixed, default: "" },

    // ✅ IMPORTANT: Mixed car tu mets "-" et aussi des nombres
    puHt: { type: mongoose.Schema.Types.Mixed, default: "" },

    // ✅ IMPORTANT: Mixed car tu mets "OFFERT" / "-" / montant
    montantHt: { type: mongoose.Schema.Types.Mixed, default: "" },

    // ✅ IMPORTANT: Mixed car tu mets "-" et aussi 20
    tva: { type: mongoose.Schema.Types.Mixed, default: "" },

    // (facultatif mais utile pour ton rendu PDF)
    scope: { type: String, default: "" }, // "mensualite" | "hors_mensualite" | "detail"
    kind: { type: String, default: "" }, // "pitch" | "other"
    isInfo: { type: Boolean, default: false },
    isDetail: { type: Boolean, default: false },
  },
  { _id: false }
);

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
      financementMonths: { type: String, default: "" }, // optionnel (si tu veux le stocker côté client)
    },

    // ✅ Devis meta
    devisNumber: { type: String, default: "" },
    validityDays: { type: Number, default: 30 },

    // ✅ Lignes du tableau
    lines: { type: [LineSchema], default: [] },

    // ✅ Brut devis (utile pour regénérer / debug)
    pitchInstances: { type: Array, default: [] },
    otherSelections: { type: Object, default: {} },

    // ✅ Totaux (comme ton PDF: Mensualité HT / TVA / TTC)
    totals: {
      mensualiteHt: { type: Number, default: 0 },
      totalTva: { type: Number, default: 0 },
      totalTtc: { type: Number, default: 0 },
    },

    // ✅ Mentions
    devisMentions: { type: String, default: "" },

    // ✅ Pour debug / export
    htmlTable: { type: String, default: "" },
    apLinesJson: { type: String, default: "" },

    // ✅ PDF stocké en DB
    pdfBuffer: { type: Buffer, default: null },
    contentType: { type: String, default: "application/pdf" },
    pages: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AgentPdf", AgentPdfSchema);
