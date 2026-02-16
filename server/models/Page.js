const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" }, // texte simple ou HTML
    isPwa: { type: Boolean, default: false }, // ✅ la clé
    pwaName: { type: String, default: "" },
    pwaThemeColor: { type: String, default: "#000000" },
    updatedAtIso: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Page", PageSchema);
