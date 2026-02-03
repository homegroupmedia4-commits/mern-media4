const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
npm start

const NameSchema = new mongoose.Schema(
  { value: { type: String, required: true } },
  { timestamps: true }
);

const Name = mongoose.model("Name", NameSchema);

app.post("/api/names", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const saved = await Name.create({ value: name });
  res.json(saved);
});

app.get("/api/names/latest", async (req, res) => {
  const latest = await Name.findOne().sort({ createdAt: -1 });
  res.json({ name: latest?.value || null });
});

const PORT = process.env.PORT || 10000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connecté");
    app.listen(PORT, () =>
      console.log(`✅ Serveur lancé sur http://localhost:${PORT}`)
    );
  })
  .catch(console.error);
