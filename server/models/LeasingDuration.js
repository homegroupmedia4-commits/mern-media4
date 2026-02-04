const mongoose = require("mongoose");

const leasingDurationSchema = new mongoose.Schema(
  {
    months: { type: Number, required: true, min: 1, max: 240 },
  },
  { timestamps: true }
);

leasingDurationSchema.index({ months: 1 }, { unique: true });

module.exports = mongoose.model("LeasingDuration", leasingDurationSchema);
