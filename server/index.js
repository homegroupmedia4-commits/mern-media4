const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const namesRouter = require("./routes/names");
const app = express();

/**
 * CORS (préflight inclus)
 */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ IMPORTANT: ne pas utiliser "*" ici -> utiliser une regex
app.options(/.*/, cors());

app.use(express.json());

app.get("/", (req, res) => res.send("OK API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/names", namesRouter);

const PORT = process.env.PORT || 10000;

// ⚠️ Dans Render tu as MONGO_URI, donc on le prend aussi
const MONGO = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI;

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
