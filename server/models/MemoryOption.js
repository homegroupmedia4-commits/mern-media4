const mongoose = require("mongoose");

const memoryOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

memoryOptionSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("MemoryOption", memoryOptionSchema);
