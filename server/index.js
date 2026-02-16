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

const Page = require("./models/Page");









app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.static("public"));


const normSlug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_/]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "");

// ✅ manifest par slug (uniquement si page.isPwa)
app.get("/:slug/manifest.webmanifest", async (req, res) => {
  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page || !page.isPwa) return res.status(404).end();

  const name = (page.pwaName || page.title || slug).trim() || slug;

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.json({
    name,
    short_name: name.slice(0, 12),
    start_url: `/${slug}/`,
    scope: `/${slug}/`,
    display: "standalone",
    background_color: "#000000",
    theme_color: page.pwaThemeColor || "#000000",
    icons: [
      { src: "/pwa-icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  });
});

// ✅ service worker par slug (scope strict /slug/)
app.get("/:slug/sw.js", async (req, res) => {
  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page || !page.isPwa) return res.status(404).end();

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(`
    const CACHE = "pwa-${slug}-v1";
    const ROOT = "/${slug}/";

    self.addEventListener("install", (e) => {
      e.waitUntil(caches.open(CACHE).then(c => c.addAll([ROOT])));
      self.skipWaiting();
    });

    self.addEventListener("activate", (e) => {
      e.waitUntil(self.clients.claim());
    });

    self.addEventListener("fetch", (e) => {
      const url = new URL(e.request.url);
      if (!url.pathname.startsWith(ROOT)) return;
      e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request))
      );
    });
  `);
});



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
