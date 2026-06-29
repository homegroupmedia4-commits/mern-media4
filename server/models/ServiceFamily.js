const mongoose = require("mongoose");
const serviceFamilySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
module.exports = mongoose.model("ServiceFamily", serviceFamilySchema);
