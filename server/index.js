const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

/**
 * Middlewares
 */
app.use(
  cors({
    origin: "*", // OK pour test / MVP — on pourra restreindre ensuite
  })
);
app.use(express.json());

/**
 * Mongo model
 */
const NameSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
  },
  { timestamps: true }
);

const Name = mongoose.model("Name", NameSchema);

/**
 * Routes
 */
app.post("/api/names", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "name required" });
    }

    const saved = await Name.create({ value: name });
    res.json(saved);
  } catch (err) {
    console.error("POST /api/names error:", err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/names/latest", async (req, res) => {
  try {
    const latest = await Name.findOne().sort({ createdAt: -1 });
    res.json(latest); // 🔥 cohérent avec le front (latest.value)
  } catch (err) {
    console.error("GET /api/names/latest error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/**
 * Server
 */
const PORT = process.env.PORT || 10000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connecté");
    app.listen(PORT, () =>
      console.log(`🚀 API ready on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
