const mongoose = require("mongoose");

const ClientNoteSchema = new mongoose.Schema({
  clientKey: { type: String, required: true, index: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
  commentaire: { type: String, default: "" },
}, { timestamps: true });

ClientNoteSchema.index({ clientKey: 1, agentId: 1 }, { unique: true });

module.exports = mongoose.model("ClientNote", ClientNoteSchema);
