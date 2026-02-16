// server/routes/pages.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Page = require("../models/Page");

const router = express.Router();

const normSlug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_/]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "");

// =========================
// PUBLIC
// =========================
router.get("/public/:slug", async (req, res) => {
  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, page });
});

// =========================
// ADMIN AUTH (JWT)
// =========================
function requireAdminJwt(req, res, next) {
  try {
    const raw = String(req.headers.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
    if (!token) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const secret = process.env.JWT_SECRET;
    if (!secret)
      return res.status(500).json({ ok: false, error: "MISSING_JWT_SECRET" });

    const decoded = jwt.verify(token, secret);

    // ✅ option : si tu veux restreindre uniquement au token "admin"
    // (si ton payload contient un flag/role)
    // Exemple:
    // if (!decoded?.isAdmin && decoded?.role !== "admin") {
    //   return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    // }

    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
}

// =========================
// ADMIN CRUD (protégé)
// =========================
router.get("/", requireAdminJwt, async (req, res) => {
  const list = await Page.find({}).sort({ updatedAt: -1 }).lean();
  res.json({ ok: true, pages: list });
});

router.get("/:slug", requireAdminJwt, async (req, res) => {
  const slug = normSlug(req.params.slug);
  const page = await Page.findOne({ slug }).lean();
  if (!page) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.json({ ok: true, page });
});

router.post("/", requireAdminJwt, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const slug = normSlug(req.body?.slug || title);
  const isPwa = !!req.body?.isPwa;

  if (!slug) return res.status(400).json({ ok: false, error: "SLUG_REQUIRED" });

  const exists = await Page.findOne({ slug }).lean();
  if (exists) return res.status(409).json({ ok: false, error: "SLUG_EXISTS" });

  const page = await Page.create({
    slug,
    title: title || slug,
    content: content || title || slug,
    isPwa,
    pwaName: String(req.body?.pwaName || title || slug).trim(),
    pwaThemeColor: String(req.body?.pwaThemeColor || "#000000").trim(),
    updatedAtIso: new Date().toISOString(),
  });

  res.json({ ok: true, page });
});

router.put("/:slug", requireAdminJwt, async (req, res) => {
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

router.delete("/:slug", requireAdminJwt, async (req, res) => {
  const slug = normSlug(req.params.slug);
  const del = await Page.deleteOne({ slug });
  res.json({ ok: true, deleted: del.deletedCount || 0 });
});

module.exports = router;
