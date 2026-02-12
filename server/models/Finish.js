const mongoose = require("mongoose");

const FinishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
    // ✅ prix mensuel HT
    priceMonthlyHt: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Finish", FinishSchema);
