const mongoose = require("mongoose");

const AgentPdfSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
    texte: { type: String, required: true },

    // PDF stocké en DB (simple et efficace pour commencer)
    pdfBuffer: { type: Buffer, required: true },
    contentType: { type: String, default: "application/pdf" },

    pages: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AgentPdf", AgentPdfSchema);
