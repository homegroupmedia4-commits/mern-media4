const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const namesRouter = require("./routes/names");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => res.send("OK API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

// routes
app.use("/api/names", namesRouter);

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
