const mongoose = require("mongoose");

const pitchCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pitchCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("PitchCategory", pitchCategorySchema);
