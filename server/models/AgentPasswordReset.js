const mongoose = require("mongoose");

const agentPasswordResetSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true, index: true },

    // On stocke un hash du token (jamais le token en clair)
    tokenHash: { type: String, required: true, index: true },

    // expiration
    expiresAt: { type: Date, required: true, index: true },

    // anti-reuse
    usedAt: { type: Date, default: null },

    // optionnel: debug / logs
    createdIp: { type: String, default: "" },
    usedIp: { type: String, default: "" },
  },
  { timestamps: true }
);

// TTL Mongo (supprime automatiquement après expiration)
agentPasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AgentPasswordReset", agentPasswordResetSchema);
