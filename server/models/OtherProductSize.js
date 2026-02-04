const mongoose = require("mongoose");

const otherProductSizeSchema = new mongoose.Schema(
  {
    sizeInches: { type: Number, required: true, min: 1, max: 500 }, // Taille (pouces)
    product: {
      type: String,
      required: true,
      enum: ["Totems", "Ecrans muraux", "Kiosques"],
    },
    leasingMonths: { type: Number, required: true, min: 1, max: 240 },
    price: { type: Number, required: true, min: 0 },
    productCode: { type: String, required: true, trim: true, maxlength: 40 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// code produit unique (simple & efficace)
otherProductSizeSchema.index({ productCode: 1 }, { unique: true });

module.exports = mongoose.model("OtherProductSize", otherProductSizeSchema);
