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

async function generateDevisNumber4() {
  // 4 chiffres: 1000 → 9999
  for (let i = 0; i < 20; i++) {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const exists = await AgentPdf.findOne({ devisNumber: n }).select("_id").lean();
    if (!exists) return n;
  }
  // fallback ultra rare
  return String(Math.floor(1000 + Math.random() * 9000));
}




function fmt2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
}

function normalizeBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function buildDevisMentions({ finalType }) {
  const base =
    "Devis gratuit. Les prix TTC sont établis sur la base des taux de TVA en vigueur à la date de remise de l'offre. Toute variation de ces taux sera répercutée sur les prix.";

  let fin = "";
  if (finalType === "achat") {
    fin = "L’acceptation du devis vaut commande ferme et acceptation des conditions générales de vente.";
  } else if (finalType === "location_evenementiel") {
    fin = "L’acceptation du devis vaut commande ferme et acceptation des conditions générales de location-évènementiel.";
  } else {
    fin = "L’acceptation du devis vaut commande ferme et acceptation des conditions générales de location-maintenance.";
  }

  return `${base} ${fin}`;
}

/**
 * ✅ Construit les lignes "comme ton script CF7"
 * - Pitch lines (déjà calculées côté front: pi.montantHt, pi.prixTotalHtMois, etc.)
 * - + PLAYER (0)
 * - + ABOBR (19.95)
 * - + INFO
 * - + PORT (visuel OFFERT si checkbox)
 * - + INST (visuel OFFERT si checkbox)
 * - + PARA (visuel OFFERT si checkbox) + ligne détail sous PARA
 *
 * IMPORTANT: Totaux = Σ pitch montantHt + 19.95 (+ autres produits si tu en ajoutes plus tard)
 * (comme ton PDF exemple) :contentReference[oaicite:1]{index=1}
 */
function buildLinesAndTotals({ pitchInstances = [], client = {}, finalType = "location_maintenance" }) {
  const tvaRate = 20;

  // 1) Lignes pitchs
  const pitchLines = pitchInstances.map((pi) => {
    const code = pi.codeProduit || pi.code || "—";
    const descParts = [];
    if (pi.pitchLabel) descParts.push(pi.pitchLabel);
  if (pi.largeurM && pi.hauteurM) descParts.push(`${pi.largeurM}x${pi.hauteurM}m`);
    if (pi.largeurM && pi.hauteurM) descParts.push(`${pi.largeurM}x${pi.hauteurM}m`);
    if (pi.largeurPx && pi.hauteurPx) descParts.push(`${pi.largeurPx}x${pi.hauteurPx}px`);
    if (pi.categorieName) descParts.push(`Écran ${pi.categorieName}`);

    const description = descParts.filter(Boolean).join(" — ") || "—";
    const qty = parseInt(pi.quantite || "1", 10) || 1;

    // pu = prixTotalHtMois (mensuel ou achat)
    const puHt = Number(pi.prixTotalHtMois || 0) || 0;

    // montantHt = readOnly calculé par front (string)
    const montant = Number(pi.montantHt || 0) || 0;

    return {
      code,
      description,
      qty,
      puHt,
      montantHt: fmt2(montant),
      tva: tvaRate,
    };
  });

  const qtyTotal = pitchLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  // 2) PLAYER (visuel)
  const playerLine = qtyTotal > 0
    ? [{ code: "NTB40", description: "PLAYER", qty: qtyTotal, puHt: 0, montantHt: fmt2(0), tva: tvaRate }]
    : [];

  // 3) ABOBR (19,95 * qtyTotal en visuel, mais dans ton PDF exemple c’est 1 ligne qty=1)
  // Ton exemple affiche qty=1 (pas qtyTotal). On reproduit ton PDF. :contentReference[oaicite:2]{index=2}
  const abobrLine = qtyTotal > 0
    ? [{ code: "ABOBR", description: "ABONNEMENT BRONZE LOGICIEL ET MAINTENANCE", qty: 1, puHt: 19.95, montantHt: fmt2(19.95), tva: tvaRate }]
    : [];

  // 4) INFO (visuel)
  const infoLine = qtyTotal > 0
    ? [{ code: "INFO", description: "Non inclus dans la mensualité, facturation en sus :", qty: null, puHt: null, montantHt: "-", tva: null }]
    : [];

  // 5) PORT (visuel)
  const portOffert = normalizeBool(client.fraisPortOfferts);
  const portLine = qtyTotal > 0
    ? [{
        code: "PORT",
        description: "FRAIS DE PORT",
        qty: qtyTotal,
        puHt: 300,
        montantHt: portOffert ? "OFFERT" : fmt2(qtyTotal * 300),
        tva: tvaRate,
      }]
    : [];

  // 6) INST (visuel)
  const instOffert = normalizeBool(client.fraisInstallationOfferts);
  const instLine = qtyTotal > 0
    ? [{
        code: "INST",
        description: "INSTALLATION (Murs leds)",
        qty: qtyTotal,
        puHt: 600,
        montantHt: instOffert ? "OFFERT" : fmt2(qtyTotal * 600),
        tva: tvaRate,
      }]
    : [];

  // 7) PARA (visuel)
  const paraOffert = normalizeBool(client.fraisParametrageOfferts);
  const paraLine = qtyTotal > 0
    ? [{
        code: "PARA",
        description: "PARAMÉTRAGE",
        qty: qtyTotal,
        puHt: 250,
        montantHt: paraOffert ? "OFFERT" : fmt2(qtyTotal * 250),
        tva: tvaRate,
      }]
    : [];

  // 8) Ligne détail sous PARA (commentaire + phrase leasing)
  const paraDetail = [];
  const com = String(client.commentaires || "").trim();
  if (qtyTotal > 0) {
    const leasingMonths = pitchInstances?.[0]?.financementMonths || "x";
    const detail = [
      com ? com : null,
      `Devis mensuel sur la base d'un leasing de ${leasingMonths} mois avec garantie incluse`,
    ].filter(Boolean).join("\n");

    paraDetail.push({
      code: "",
      description: detail,
      qty: null,
      puHt: null,
      montantHt: "",
      tva: null,
      isDetail: true,
    });
  }

  // ✅ Totaux “mensualité” = Σ pitch + 19.95 (comme ton exemple PDF) :contentReference[oaicite:3]{index=3}
  const sumPitch = pitchLines.reduce((s, l) => s + (Number(l.montantHt) || 0), 0);
  const mensualiteHt = sumPitch + (qtyTotal > 0 ? 19.95 : 0);
  const totalTva = mensualiteHt * 0.2;
  const totalTtc = mensualiteHt + totalTva;

  const finalLines = [
    ...pitchLines,
    ...playerLine,
    ...abobrLine,
    ...infoLine,
    ...portLine,
    ...instLine,
    ...paraLine,
    ...paraDetail,
  ];

  return {
    lines: finalLines,
    totals: { mensualiteHt, totalTva, totalTtc },
    devisMentions: buildDevisMentions({ finalType }),
  };
}

function generateColoredDevisPdfBuffer({ docData, agent }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Palette “vert Media4” (simple)
      const GREEN = "#8bc53f";
      const DARK = "#111111";
      const GREY = "#666666";

      const pageWidth = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageWidth - doc.page.margins.right;
      const contentW = right - left;

      // Header
      doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK).text("SAS MEDIA4", left, 40);
      doc.font("Helvetica").fontSize(10).fillColor(GREY).text("1 Chemin du chêne rond", left, 60);
      doc.text("91570 BIEVRES", left, 72);
      doc.text("Tél : 01.85.41.01.00", left, 84);
      doc.text("Site web : www.media4.fr", left, 96);

      doc.font("Helvetica-Bold").fontSize(18).fillColor(DARK).text("Devis", 0, 55, { align: "center" });

      // Bloc client (droite)
      const c = docData.client || {};
      const clientLines = [
        `${c.nom || ""} ${c.prenom || ""}`.trim(),
        c.societe || "",
        c.adresse1 || "",
        c.adresse2 || "",
        `${c.codePostal || ""} ${c.ville || ""}`.trim(),
        c.email || "",
        c.telephone || "",
      ].filter(Boolean);

      doc.font("Helvetica").fontSize(10).fillColor(DARK);
      doc.text(clientLines.join("\n"), left + contentW * 0.55, 85, { width: contentW * 0.45 });

      // Table meta (Numéro / Date / Durée)
      const num = docData.devisNumber || `DE${String(docData._id || "").slice(-5).toUpperCase()}`;
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const validity = `${docData.validityDays || 30} jours`;

      const metaY = 140;
      const metaH = 22;
      const colW = contentW / 3;

      doc.save();
      doc.rect(left, metaY, contentW, metaH).stroke();
      doc.rect(left, metaY, colW, metaH).fillAndStroke(GREEN);
      doc.rect(left + colW, metaY, colW, metaH).fillAndStroke(GREEN);
      doc.rect(left + colW * 2, metaY, colW, metaH).fillAndStroke(GREEN);
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
      doc.text("Numéro", left + 6, metaY + 6);
      doc.text("Date", left + colW + 6, metaY + 6);
      doc.text("Durée de validité", left + colW * 2 + 6, metaY + 6);
      doc.restore();

      doc.font("Helvetica").fontSize(10).fillColor(DARK);
      doc.text(num, left + 6, metaY + metaH + 6);
      doc.text(dateStr, left + colW + 6, metaY + metaH + 6);
      doc.text(validity, left + colW * 2 + 6, metaY + metaH + 6);

      // Tableau lignes
      const tableY = metaY + 60;
      const rowH = 18;

      const cols = [
        { key: "code", title: "Code", w: contentW * 0.12, align: "left" },
        { key: "description", title: "Description", w: contentW * 0.52, align: "left" },
        { key: "qty", title: "Qté", w: contentW * 0.08, align: "center" },
        { key: "puHt", title: "P.U. HT", w: contentW * 0.12, align: "right" },
        { key: "montantHt", title: "Montant HT", w: contentW * 0.12, align: "right" },
        { key: "tva", title: "TVA", w: contentW * 0.04, align: "right" },
      ];

      // Header table
      let x = left;
      let y = tableY;
      doc.save();
      doc.rect(left, y, contentW, rowH).fill(GREEN).stroke();
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
      cols.forEach((cdef) => {
        doc.text(cdef.title, x + 4, y + 5, { width: cdef.w - 8, align: cdef.align });
        x += cdef.w;
      });
      doc.restore();

      // Rows
      y += rowH;
      doc.font("Helvetica").fontSize(9).fillColor(DARK);

      (docData.lines || []).forEach((line) => {
        const isDetail = !!line.isDetail;
        const height = isDetail ? 34 : rowH;

        // new page if needed
        if (y + height > doc.page.height - 160) {
          doc.addPage();
          y = 60;
        }

        // grid
        doc.rect(left, y, contentW, height).stroke();
        let xx = left;

        const cell = (val, w, align = "left", bold = false) => {
          doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(DARK);
          const txt = val === null || val === undefined ? "" : String(val);
          doc.text(txt, xx + 4, y + 5, { width: w - 8, align });
          xx += w;
        };

        cell(line.code || "", cols[0].w, "left", !isDetail);
        cell(line.description || "", cols[1].w, "left", isDetail);
        cell(line.qty === null ? "" : String(line.qty || ""), cols[2].w, "center");
        cell(line.puHt === null ? "" : fmt2(line.puHt || 0), cols[3].w, "right");
        cell(String(line.montantHt || ""), cols[4].w, "right");
        cell(line.tva === null ? "" : fmt2(line.tva || 0), cols[5].w, "right");

        y += height;
      });

      // Mentions + Totaux (bloc vert à droite)
      const mentions = String(docData.devisMentions || "").trim();
      if (mentions) {
        doc.moveDown(1);
        doc.font("Helvetica").fontSize(8).fillColor(DARK);
        doc.text(mentions, left, y + 8, { width: contentW * 0.62 });
      }

      const totals = docData.totals || { mensualiteHt: 0, totalTva: 0, totalTtc: 0 };
      const boxW = contentW * 0.32;
      const boxX = left + contentW - boxW;
      const boxY = y + 30;

      doc.save();
      doc.rect(boxX, boxY, boxW, 90).stroke();
      // 4 lignes (labels verts)
      const labels = [
        ["Mensualité HT", fmt2(totals.mensualiteHt)],
        ["Total TVA", fmt2(totals.totalTva)],
        ["Total TTC", fmt2(totals.totalTtc)],
        ["Mensualité TTC", `${fmt2(totals.totalTtc)} €`],
      ];

      let ly = boxY;
      labels.forEach(([lab, val], idx) => {
        doc.rect(boxX, ly, boxW * 0.55, 22).fillAndStroke(GREEN);
        doc.rect(boxX + boxW * 0.55, ly, boxW * 0.45, 22).stroke();
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9).text(lab, boxX + 6, ly + 6, { width: boxW * 0.55 - 12 });
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(idx === 3 ? 10 : 9).text(val, boxX + boxW * 0.55 + 6, ly + 6, { width: boxW * 0.45 - 12, align: "right" });
        ly += 22;
      });
      doc.restore();

      // Footer
      doc.font("Helvetica").fontSize(8).fillColor(GREY);
      doc.text("Siret : 93070650200018 - APE : 7311Z - N° TVA intracom : FR29930706502 - Capital : 10 000,00 €", left, doc.page.height - 60, { width: contentW, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}



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


// ✅ POST /api/agents/devis  (enregistrer devis JSON)
router.post("/devis", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;

    const { client = {}, pitchInstances = [], validityDays = 30, finalType = "location_maintenance" } = req.body || {};

    if (!Array.isArray(pitchInstances) || pitchInstances.length === 0) {
      return res.status(400).json({ message: "Aucun pitch sélectionné." });
    }

    const { lines, totals, devisMentions } = buildLinesAndTotals({
      pitchInstances,
      client,
      finalType,
    });

   const devisNumber = await generateDevisNumber4();


    const saved = await AgentPdf.create({
      agentId: agent._id,
      client,
      devisNumber,
        pitchInstances,
      validityDays,
      lines,
      totals,
      devisMentions,
      pages: 1,
    });

    return res.json({ ok: true, devisId: saved._id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur save devis." });
  }
});

// ✅ POST /api/agents/devis/:id/pdf  (génère pdf couleur et stocke)
router.post("/devis/:id/pdf", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;
    const docData = await AgentPdf.findById(req.params.id);
    if (!docData) return res.status(404).json({ message: "Devis introuvable." });
    if (String(docData.agentId) !== String(agent._id)) return res.status(403).json({ message: "Forbidden" });

    const pdfBuffer = await generateColoredDevisPdfBuffer({ docData, agent });

    docData.pdfBuffer = pdfBuffer;
    docData.contentType = "application/pdf";
    docData.pages = 1;
    await docData.save();

    return res.json({
      ok: true,
      pdfUrl: `/api/agents/devis/${docData._id}/pdf`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur génération PDF." });
  }
});

// ✅ GET /api/agents/devis/:id/pdf  (serve le PDF)
router.get("/devis/:id/pdf", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;
    const doc = await AgentPdf.findById(req.params.id);
    if (!doc) return res.status(404).send("Not found");
    if (String(doc.agentId) !== String(agent._id)) return res.status(403).send("Forbidden");
    if (!doc.pdfBuffer) return res.status(400).send("PDF not generated");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="devis-${doc.devisNumber || doc._id}.pdf"`);
    return res.send(doc.pdfBuffer);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});


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

// ✅ GET /api/agents/admin/list
// Retourne tous les agents inscrits (pour l’admin UI)
router.get("/admin/list", async (req, res) => {
  try {
    const agents = await Agent.find()
      .sort({ createdAt: -1 })
      .select(
        "_id nom prenom email role societe siret adresse codePostal ville telephonePortable telephoneFixe pays parrainId createdAt"
      )
      .lean();

    res.json(agents);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


module.exports = router;
