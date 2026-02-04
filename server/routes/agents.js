const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_TTL = "7d";

// GET /api/agents/parrains -> liste des parrains (tous les agents existants)
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
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }

    const existing = await Agent.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: "Email déjà utilisé." });

    // si parrainId fourni, on check qu'il existe
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

    const token = jwt.sign({ agentId: agent._id }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    res.status(201).json({
      token,
      agent: { _id: agent._id, nom: agent.nom, prenom: agent.prenom, email: agent.email, role: agent.role },
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

    if (!e || !p) return res.status(400).json({ message: "Email et mot de passe requis." });

    const agent = await Agent.findOne({ email: e });
    if (!agent) return res.status(401).json({ message: "Identifiants invalides." });

    const ok = await bcrypt.compare(p, agent.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides." });

    const token = jwt.sign({ agentId: agent._id }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    res.json({
      token,
      agent: { _id: agent._id, nom: agent.nom, prenom: agent.prenom, email: agent.email, role: agent.role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/agents/me (avec Bearer token)
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Non autorisé." });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token invalide." });
    }

    const agent = await Agent.findById(payload.agentId).select("_id nom prenom email role");
    if (!agent) return res.status(404).json({ message: "Agent introuvable." });

    res.json(agent);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
