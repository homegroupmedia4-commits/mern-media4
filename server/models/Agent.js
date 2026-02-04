const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 60 },
    prenom: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },

    parrainId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },

    societe: { type: String, trim: true, maxlength: 120, default: "" },
    siret: { type: String, trim: true, maxlength: 20, default: "" },

    adresse: { type: String, trim: true, maxlength: 200, default: "" },
    codePostal: { type: String, trim: true, maxlength: 12, default: "" },
    ville: { type: String, trim: true, maxlength: 80, default: "" },

    telephonePortable: { type: String, trim: true, maxlength: 30, default: "" },
    telephoneFixe: { type: String, trim: true, maxlength: 30, default: "" },

    pays: { type: String, trim: true, default: "France" },

    role: {
      type: String,
      enum: ["agent", "technicien", "responsable"],
      default: "agent",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);
