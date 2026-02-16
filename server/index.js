const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const namesRouter = require("./routes/names");
const app = express();
const pitchCategoriesRouter = require("./routes/pitchCategories");
const pitchesRouter = require("./routes/pitches");
const leasingDurationsRouter = require("./routes/leasingDurations");
const staticValuesRouter = require("./routes/staticValues");
const otherProductSizesRouter = require("./routes/otherProductSizes");
const memoryOptionsRouter = require("./routes/memoryOptions");
const agentsRouter = require("./routes/agents");
const productsRouter = require("./routes/products");
const finishesRouter = require("./routes/finishes");
const fixationsRouter = require("./routes/fixations");








app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());


app.use("/api/pitch-categories", pitchCategoriesRouter);
app.use("/api/pitches", pitchesRouter);
app.use("/api/leasing-durations", leasingDurationsRouter);
app.use("/api/static-values", staticValuesRouter);
app.use("/api/other-product-sizes", otherProductSizesRouter);
app.use("/api/memory-options", memoryOptionsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/products", productsRouter);
app.use("/api/finishes", finishesRouter);
app.use("/api/fixations", fixationsRouter);


app.use("/api/pages", require("./routes/pages"));








app.get("/", (req, res) => res.send("OK API is running ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

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
