const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");
const PDFDocument = require("pdfkit");
const AgentPdf = require("../models/AgentPdf");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_TTL = "7d";

/**
 * Auth middleware
 * - accepte Bearer token (headers)
 * - accepte aussi ?token=... (utile pour ouvrir un PDF dans un nouvel onglet)
 */
async function requireAgentAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const headerToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const queryToken = req.query?.token || null;

    const token = headerToken || queryToken;
    if (!token) return res.status(401).json({ message: "Non autorisé." });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token invalide." });
    }

    const agent = await Agent.findById(payload.agentId).select(
      "_id nom prenom email role"
    );
    if (!agent) return res.status(404).json({ message: "Agent introuvable." });

    req.agent = agent;
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

function generate5PagePdfBuffer({ texte, agent }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const fullName =
        agent?.prenom && agent?.nom ? `${agent.prenom} ${agent.nom}` : "Agent";
      const email = agent?.email || "";

      for (let i = 1; i <= 5; i++) {
        if (i > 1) doc.addPage();

        doc.fontSize(18).text("Document Agent", { align: "left" }).moveDown(0.3);

        doc.fontSize(11).text(`Agent : ${fullName}`);
        doc.fontSize(11).text(`Email : ${email}`);
        doc.fontSize(11).text(`Page : ${i}/5`);
        doc.moveDown(1);

        doc.fontSize(13).text("Texte saisi :", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(String(texte || ""), {
          align: "left",
          lineGap: 4,
        });

        doc.moveDown(2);
        doc.fontSize(10).text("— Généré automatiquement —", {
          align: "center",
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * POST /api/agents/pdfs
 * body: { texte }
 * -> crée + stocke en DB + renvoie l'URL
 */
router.post("/pdfs", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;

    const { texte } = req.body || {};
    if (!texte || String(texte).trim().length < 1) {
      return res.status(400).json({ message: "Texte obligatoire." });
    }

    const pdfBuffer = await generate5PagePdfBuffer({
      texte: String(texte),
      agent,
    });

    const saved = await AgentPdf.create({
      agentId: agent._id,
      texte: String(texte),
      pdfBuffer,
      pages: 5,
    });

    return res.json({
      ok: true,
      id: saved._id,
      pdfUrl: `/api/agents/pdfs/${saved._id}`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur génération PDF." });
  }
});

/**
 * GET /api/agents/pdfs/:id
 * - nécessite auth (Bearer OU ?token=)
 * - renvoie le PDF (inline)
 */
router.get("/pdfs/:id", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;

    const doc = await AgentPdf.findById(req.params.id);
    if (!doc) return res.status(404).send("Not found");

    if (String(doc.agentId) !== String(agent._id))
      return res.status(403).send("Forbidden");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="agent-${agent._id}-doc-${doc._id}.pdf"`
    );
    return res.send(doc.pdfBuffer);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

// GET /api/agents/parrains
router.get("/parrains", async (req, res) => {
  try {
    const list = await Agent.find()
      .sort({ createdAt: -1 })
      .select("_id nom prenom email");
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/agents/register
router.post("/register", async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      confirmPassword,
      parrainId,
      societe,
      siret,
      adresse,
      codePostal,
      ville,
      telephonePortable,
      telephoneFixe,
      pays,
      role,
    } = req.body;

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas." });
    }

    const existing = await Agent.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (existing) return res.status(409).json({ message: "Email déjà utilisé." });

    let validParrainId = null;
    if (parrainId) {
      const p = await Agent.findById(parrainId).select("_id");
      if (p) validParrainId = p._id;
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const agent = await Agent.create({
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      parrainId: validParrainId,

      societe: String(societe || "").trim(),
      siret: String(siret || "").trim(),

      adresse: String(adresse || "").trim(),
      codePostal: String(codePostal || "").trim(),
      ville: String(ville || "").trim(),

      telephonePortable: String(telephonePortable || "").trim(),
      telephoneFixe: String(telephoneFixe || "").trim(),

      pays: String(pays || "France").trim(),
      role: role || "agent",
    });

    const token = jwt.sign({ agentId: agent._id }, JWT_SECRET, {
      expiresIn: TOKEN_TTL,
    });

    res.status(201).json({
      token,
      agent: {
        _id: agent._id,
        nom: agent.nom,
        prenom: agent.prenom,
        email: agent.email,
        role: agent.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/agents/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const e = String(email || "").toLowerCase().trim();
    const p = String(password || "");

    if (!e || !p)
      return res
        .status(400)
        .json({ message: "Email et mot de passe requis." });

    const agent = await Agent.findOne({ email: e });
    if (!agent) return res.status(401).json({ message: "Identifiants invalides." });

    const ok = await bcrypt.compare(p, agent.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides." });

    const token = jwt.sign({ agentId: agent._id }, JWT_SECRET, {
      expiresIn: TOKEN_TTL,
    });

    res.json({
      token,
      agent: {
        _id: agent._id,
        nom: agent.nom,
        prenom: agent.prenom,
        email: agent.email,
        role: agent.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/agents/me
router.get("/me", requireAgentAuth, async (req, res) => {
  res.json(req.agent);
});

module.exports = router;
