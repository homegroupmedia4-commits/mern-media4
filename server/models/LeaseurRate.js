// server/models/LeaseurRate.js
const mongoose = require("mongoose");

function computeTaeg(taegAnnual, months) {
  const t = Number(taegAnnual) || 0; // décimal ex: 0.1622
  const n = Number(months) || 0;
  const r = t / 12;
  if (n <= 0 || r <= 0) {
    return { coutCreditSurMontantFinance: 0, coutLeaseurSurCoutTotal: 0 };
  }
  const coutCredit = ((r * n) / (1 - Math.pow(1 + r, -n))) - 1;
  const coutLeaseur = coutCredit / (1 + coutCredit);
  return {
    coutCreditSurMontantFinance: coutCredit,
    coutLeaseurSurCoutTotal: coutLeaseur,
  };
}

const LeaseurRateSchema = new mongoose.Schema(
  {
    months: { type: Number, required: true, unique: true },
    taegAnnual: { type: Number, default: 0 }, // décimal (0.1622 = 16,22%)
    coutCreditSurMontantFinance: { type: Number, default: 0 }, // auto
    coutLeaseurSurCoutTotal: { type: Number, default: 0 },     // auto
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LeaseurRateSchema.pre("save", function (next) {
  const r = computeTaeg(this.taegAnnual, this.months);
  this.coutCreditSurMontantFinance = r.coutCreditSurMontantFinance;
  this.coutLeaseurSurCoutTotal = r.coutLeaseurSurCoutTotal;
  next();
});

const LeaseurRate = mongoose.model("LeaseurRate", LeaseurRateSchema);
module.exports = LeaseurRate;
module.exports.computeTaeg = computeTaeg;
