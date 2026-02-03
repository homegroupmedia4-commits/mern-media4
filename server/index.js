const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const NameSchema = new mongoose.Schema(
  { value: { type: String, required: true } },
  { timestamps: true }
);

const Name = mongoose.model("Name", NameSchema);

app.get("/", (req, res) => res.send("OK API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/names", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });

    const saved = await Name.create({ value: name.trim() });
    res.json(saved);
  } catch (err) {
    console.error("POST /api/names error:", err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/names/latest", async (req, res) => {
  try {
    const latest = await Name.findOne().sort({ createdAt: -1 });
    res.json(latest); // { value: "...", ...}
  } catch (err) {
    console.error("GET /api/names/latest error:", err);
    res.status(500).json({ error: "server error" });
  }
});

const PORT = process.env.PORT || 10000;
const MONGO = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO) {
  console.error("❌ Missing Mongo URI env var (MONGODB_URI or MONGO_URI)");
  process.exit(1);
}

mongoose
  .connect(MONGO)
  .then(() => {
    console.log("✅ MongoDB connecté");
    app.listen(PORT, () => console.log(`🚀 API ready on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
