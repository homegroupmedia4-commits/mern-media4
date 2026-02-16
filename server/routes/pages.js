const express = require("express");
const Page = require("../models/Page");

const router = express.Router();

const normSlug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_/]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "");

router.get("/public/:slug", async (req, res) => {
  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, page });
});

// ✅ (optionnel) création rapide (admin) : titre + content => slug auto
router.post("/", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const slug = normSlug(req.body?.slug || title);
  const isPwa = !!req.body?.isPwa;

  if (!slug) return res.status(400).json({ ok: false, error: "SLUG_REQUIRED" });

  const page = await Page.create({
    slug,
    title: title || slug,
    content: content || title || slug,
    isPwa,
    pwaName: req.body?.pwaName || title || slug,
    updatedAtIso: new Date().toISOString(),
  });

  res.json({ ok: true, page });
});


// =========================
// ADMIN CRUD (simple token)
// =========================
function isAdmin(req) {
  const raw = String(req.headers.authorization || "");
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
  const expected = String(process.env.ADMIN_TOKEN || "").trim();
  return expected && token && token === expected;
}

router.get("/", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const list = await Page.find({}).sort({ updatedAt: -1 }).lean();
  res.json({ ok: true, pages: list });
});

router.get("/:slug", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.json({ ok: true, page });
});

router.put("/:slug", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const slug = normSlug(req.params.slug);
  const patch = {
    title: String(req.body?.title || "").trim(),
    content: String(req.body?.content || "").trim(),
    isPwa: !!req.body?.isPwa,
    pwaName: String(req.body?.pwaName || "").trim(),
    pwaThemeColor: String(req.body?.pwaThemeColor || "#000000").trim(),
    updatedAtIso: new Date().toISOString(),
  };

  const updated = await Page.findOneAndUpdate(
    { slug },
    { $set: patch },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.json({ ok: true, page: updated });
});

router.delete("/:slug", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const slug = normSlug(req.params.slug);
  const del = await Page.deleteOne({ slug });
  res.json({ ok: true, deleted: del.deletedCount || 0 });
});



module.exports = router;
