const mongoose = require("mongoose");

const otherProductSizeSchema = new mongoose.Schema(
  {
    // Taille écran (pouces)
    sizeInches: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },

    // ✅ produit lié (admin Produits)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Durée leasing
    leasingMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 240,
    },

    // Prix HT
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Code produit interne
  productCode: {
  type: String,
  trim: true,
  maxlength: 40,
  default: "",
},


    // Actif / inactif
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * ✅ Unicité métier
 * - un code produit = unique
 */
// NOTE: productCode n'est PAS unique (plusieurs durées partagent le même code, ex: TOT13)
// Si l'ancien index unique persiste en DB, exécuter dans mongosh :
//   db.otherproductsizes.dropIndex("productCode_1")
otherProductSizeSchema.index({ productCode: 1 }, { sparse: true });

otherProductSizeSchema.index(
  { productId: 1, sizeInches: 1, leasingMonths: 1 },
  { unique: true }
);


module.exports = mongoose.model("OtherProductSize", otherProductSizeSchema);
