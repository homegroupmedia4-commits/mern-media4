const mongoose = require("mongoose");
const serviceProductSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceFamily", required: true },
    designation: { type: String, required: true, trim: true, maxlength: 200 },
    reference: { type: String, default: "", trim: true, maxlength: 60 },
    prixUnitaireHt: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
module.exports = mongoose.model("ServiceProduct", serviceProductSchema);
