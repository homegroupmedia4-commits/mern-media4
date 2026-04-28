const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
   systemKey: {
  type: String,
  trim: true,
  lowercase: true,
  default: null,
  unique: true,
  sparse: true,
},
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);



module.exports = mongoose.model("Product", ProductSchema);
