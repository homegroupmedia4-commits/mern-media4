const mongoose = require("mongoose");

const pitchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    codeProduit: { type: String, required: true, trim: true, maxlength: 60 },
    dimensions: { type: String, required: true, trim: true, maxlength: 60 },
    luminosite: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "PitchCategory", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Optionnel : éviter doublons exacts par code produit
pitchSchema.index({ codeProduit: 1 }, { unique: true });

module.exports = mongoose.model("Pitch", pitchSchema);
