const mongoose = require("mongoose");

const FaqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: "Agent", trim: true },
    role: { type: String, enum: ["agent", "technicien", "tous"], default: "agent" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaqItem", FaqItemSchema);
