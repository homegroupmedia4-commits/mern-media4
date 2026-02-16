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

module.exports = router;
