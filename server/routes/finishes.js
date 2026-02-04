const express = require("express");
const router = express.Router();
const Finish = require("../models/Finish");

router.get("/", async (req, res) => {
  const list = await Finish.find().sort({ createdAt: -1 });
  res.json(list);
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Nom requis." });

    const created = await Finish.create({ name, isActive: true });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Création impossible." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const patch = {};
    if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body?.isActive !== undefined) patch.isActive = !!req.body.isActive;

    const updated = await Finish.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Update impossible." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Finish.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Delete impossible." });
  }
});

module.exports = router;
