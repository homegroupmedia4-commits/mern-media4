const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");
const PDFDocument = require("pdfkit");
const AgentPdf = require("../models/AgentPdf");
const OtherProductSize = require("../models/OtherProductSize");
const MemoryOption = require("../models/MemoryOption");
const path = require("path");
const fs = require("fs");



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
async function buildLinesAndTotals({
  pitchInstances = [],
  otherSelections = {},
  client = {},
  finalType = "location_maintenance",
}) {
  const tvaRate = 20;

  // -----------------------------
  // 1) Lignes PITCH (mensualité)
  // -----------------------------
  const pitchLines = (pitchInstances || []).map((pi) => {
    const code = pi.codeProduit || pi.code || "—";

    const descParts = [];
    if (pi.pitchLabel) descParts.push(pi.pitchLabel);

    if (pi.largeurM && pi.hauteurM) descParts.push(`${pi.largeurM}x${pi.hauteurM}m`);
    if (pi.largeurPx && pi.hauteurPx) descParts.push(`${pi.largeurPx}x${pi.hauteurPx}px`);
    if (pi.categorieName) descParts.push(`Écran ${pi.categorieName}`);

    const description = descParts.filter(Boolean).join(" — ") || "—";
    const qty = parseInt(pi.quantite || "1", 10) || 1;

    const puHt = Number(pi.prixTotalHtMois || 0) || 0;
    const montant = Number(pi.montantHt || 0) || 0;

    return {
      code,
      description,
      qty,
      puHt,
      montantHt: fmt2(montant),
      tva: tvaRate,
      scope: "mensualite",
    };
  });

  const qtyPitchTotal = pitchLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  // -----------------------------
  // 2) Lignes AUTRES PRODUITS (mensualité)
  // otherSelections = { [productId]: { leasingMonths, checked: { [rowId]: { memId, qty }}}}
  // -----------------------------
  const otherMonthlyLines = [];

  const checkedRowIds = [];
  const checkedMemIds = [];

  for (const pid of Object.keys(otherSelections || {})) {
    const sel = otherSelections?.[pid];
    const checked = sel?.checked || {};
    for (const rowId of Object.keys(checked)) {
      checkedRowIds.push(rowId);
      const memId = checked[rowId]?.memId;
      if (memId) checkedMemIds.push(memId);
    }
  }

  const sizes = checkedRowIds.length
    ? await OtherProductSize.find({ _id: { $in: checkedRowIds } }).lean()
    : [];
  const mems = checkedMemIds.length
    ? await MemoryOption.find({ _id: { $in: checkedMemIds } }).lean()
    : [];

  const sizeById = new Map(sizes.map((s) => [String(s._id), s]));
  const memById = new Map(mems.map((m) => [String(m._id), m]));

  for (const pid of Object.keys(otherSelections || {})) {
    const sel = otherSelections?.[pid];
    const checked = sel?.checked || {};

    for (const rowId of Object.keys(checked)) {
      const line = checked[rowId];
      const size = sizeById.get(String(rowId));
      if (!size) continue;

      const mem = line?.memId ? memById.get(String(line.memId)) : null;

      const basePrice = Number(size.price || 0);
      const memPrice = Number(mem?.price || 0);
      const unit = basePrice + memPrice;

      const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
      const total = unit * qty;

      // Description comme sur ton devis : “Totems - 43 pouces” / “Ecrans muraux - 24 pouces”
      // -> on utilise size.product (string) et size.sizeInches
      const productName = String(size.product || "Produit");
      const inches = size.sizeInches ? `${size.sizeInches} pouces` : "";
      const description = [productName, inches].filter(Boolean).join(" - ");

      otherMonthlyLines.push({
        code: size.productCode || size.codeProduit || "—",
        description,
        qty,
        puHt: unit,
        montantHt: fmt2(total),
        tva: tvaRate,
        scope: "mensualite",
      });
    }
  }

  // -----------------------------
  // 3) PLAYER (visuel)
  // -----------------------------
  const playerLine =
    qtyPitchTotal > 0
      ? [
          {
            code: "NTB40",
            description: "PLAYER",
            qty: qtyPitchTotal,
            puHt: 0,
            montantHt: fmt2(0),
            tva: tvaRate,
            scope: "mensualite",
          },
        ]
      : [];

  // -----------------------------
  // 4) ABOBR (toujours qty=1 comme ton PDF exemple)
  // -----------------------------
  const abobrLine =
    qtyPitchTotal > 0 || otherMonthlyLines.length
      ? [
          {
            code: "ABOBR",
            description: "ABONNEMENT BRONZE LOGICIEL ET MAINTENANCE",
            qty: 1,
            puHt: 19.95,
            montantHt: fmt2(19.95),
            tva: tvaRate,
            scope: "mensualite",
          },
        ]
      : [];

  // -----------------------------
  // 5) INFO + LIGNES “hors mensualité” (facturation en sus)
  // -----------------------------
  const infoLine =
    qtyPitchTotal > 0 || otherMonthlyLines.length
      ? [
          {
            code: "INFO",
            description: "Non inclus dans la mensualité, facturation en sus :",
            qty: "",
            puHt: "",
            montantHt: "-",
            tva: "",
            scope: "hors_mensualite",
          },
        ]
      : [];

  const portOffert = normalizeBool(client.fraisPortOfferts);
  const instOffert = normalizeBool(client.fraisInstallationOfferts);
  const paraOffert = normalizeBool(client.fraisParametrageOfferts);

  // 👉 Ici, par défaut on se base sur qtyPitchTotal (comme ton système actuel).
  // Si tu veux EXACTEMENT d’autres quantités (ex: PORT=7, INST murs leds=2, INST autres=5),
  // on peut dériver ces quantités depuis le front et les envoyer dans req.body.
  const portQty = qtyPitchTotal;
  const instQty = qtyPitchTotal;
  const paraQty = qtyPitchTotal;

  const portLine =
    portQty > 0
      ? [
          {
            code: "PORT",
            description: "FRAIS DE PORT",
            qty: portQty,
            puHt: 300,
            montantHt: portOffert ? "OFFERT" : fmt2(portQty * 300),
            tva: tvaRate,
            scope: "hors_mensualite",
          },
        ]
      : [];

  const instLine =
    instQty > 0
      ? [
          {
            code: "INST",
            description: "INSTALLATION (Murs leds)",
            qty: instQty,
            puHt: 600,
            montantHt: instOffert ? "OFFERT" : fmt2(instQty * 600),
            tva: tvaRate,
            scope: "hors_mensualite",
          },
        ]
      : [];

  const paraLine =
    paraQty > 0
      ? [
          {
            code: "PARA",
            description: "PARAMÉTRAGE",
            qty: paraQty,
            puHt: 250,
            montantHt: paraOffert ? "OFFERT" : fmt2(paraQty * 250),
            tva: tvaRate,
            scope: "hors_mensualite",
          },
        ]
      : [];

  const paraDetail = [];
  const com = String(client.commentaires || "").trim();
  const leasingMonths = pitchInstances?.[0]?.financementMonths || "x";
  if (qtyPitchTotal > 0 || otherMonthlyLines.length) {
    const detail = [
      com ? com : null,
      `Devis mensuel sur la base d'un leasing de ${leasingMonths} mois avec garantie incluse`,
    ]
      .filter(Boolean)
      .join("\n");

    paraDetail.push({
      code: "",
      description: detail,
      qty: "",
      puHt: "",
      montantHt: "",
      tva: "",
      isDetail: true,
      scope: "detail",
    });
  }

  // -----------------------------
  // 6) TOTAUX (mensualité uniquement)
  // -----------------------------
  const mensualiteBase =
    pitchLines.reduce((s, l) => s + (Number(l.montantHt) || 0), 0) +
    otherMonthlyLines.reduce((s, l) => s + (Number(l.montantHt) || 0), 0) +
    (abobrLine.length ? 19.95 : 0);

  const mensualiteHt = mensualiteBase;
  const totalTva = mensualiteHt * 0.2;
  const totalTtc = mensualiteHt + totalTva;

  const lines = [
    ...pitchLines,
    ...otherMonthlyLines,
    ...playerLine,
    ...abobrLine,
    ...infoLine,
    ...portLine,
    ...instLine,
    ...paraLine,
    ...paraDetail,
  ];

  return {
    lines,
    totals: { mensualiteHt, totalTva, totalTtc },
    devisMentions: buildDevisMentions({ finalType }),
  };
}


function generateColoredDevisPdfBuffer({ docData, agent }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 28 }); // ✅ plus compact
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const GREEN = "#8bc53f";
      const DARK = "#111111";
      const GREY = "#666666";

      const pageW = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;

      // -----------------------------
      // HEADER (gauche) + TITRE
      // -----------------------------
    // -----------------------------
// HEADER (gauche) + TITRE
// -----------------------------
const headerTopY = 22;

// ✅ 1) LOGO (à gauche)
const logoPath = path.join(__dirname, "..", "assets", "Media4logo.png");
const logoW = 70;
const logoH = 70;

let headerTextX = left;
try {
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, headerTopY, { width: logoW, height: logoH });
    // ✅ le texte démarre à droite du logo (extrême du bloc header gauche)
    headerTextX = left + logoW + 12;
  }
} catch (e) {
  // si logo absent => on laisse juste le texte
}

// ✅ 2) Tout le bloc de texte MEDIA4 en gras
doc.font("Helvetica-Bold").fillColor(DARK);

doc.fontSize(14).text("SAS MEDIA4", headerTextX, headerTopY);
doc.fontSize(9).text("1 Chemin du chêne rond", headerTextX, headerTopY + 16);
doc.fontSize(9).text("91570 BIEVRES", headerTextX, headerTopY + 28);
doc.fontSize(9).text("Tél : 01.85.41.01.00", headerTextX, headerTopY + 40);
doc.fontSize(9).text("Site web : www.media4.fr", headerTextX, headerTopY + 52);


      // -----------------------------
      // BLOC CLIENT (droite)
      // -----------------------------
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

      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(clientLines.join("\n"), left + contentW * 0.60, 58, {
        width: contentW * 0.40,
        align: "left",
      });

      // ✅ TITRE "Devis" aligné verticalement avec le bloc client
const clientTopY = 58; // <= même Y que ton doc.text client
doc.font("Helvetica-Bold")
  .fontSize(16)
  .fillColor(DARK)
  .text("Devis", 0, clientTopY, { align: "center" });


      // -----------------------------
      // TABLE META : Numéro / Date / Durée
      // -----------------------------
      const num = docData.devisNumber ? `DE${docData.devisNumber}` : `DE${String(docData._id || "").slice(-5).toUpperCase()}`;
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const validity = `${docData.validityDays || 30} jours`;

    const metaY = 118;
const metaH = 18;

// ✅ moitié de la largeur utile
const metaW = contentW * 0.5;
const metaX = left;
const colW = metaW / 3;

// header
doc.save();
doc.rect(metaX, metaY, metaW, metaH).stroke();
for (let i = 0; i < 3; i++) {
  doc.rect(metaX + colW * i, metaY, colW, metaH).fillAndStroke(GREEN);
}
doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
doc.text("Numéro", metaX + 6, metaY + 5);
doc.text("Date", metaX + colW + 6, metaY + 5);
doc.text("Durée de validité", metaX + colW * 2 + 6, metaY + 5);
doc.restore();

// values
doc.font("Helvetica").fontSize(9).fillColor(DARK);
doc.text(num, metaX + 6, metaY + metaH + 5);
doc.text(dateStr, metaX + colW + 6, metaY + metaH + 5);
doc.text(validity, metaX + colW * 2 + 6, metaY + metaH + 5);

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
      doc.text("Numéro", left + 6, metaY + 5);
      doc.text("Date", left + colW + 6, metaY + 5);
      doc.text("Durée de validité", left + colW * 2 + 6, metaY + 5);
      doc.restore();

      // values
      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(num, left + 6, metaY + metaH + 5);
      doc.text(dateStr, left + colW + 6, metaY + metaH + 5);
      doc.text(validity, left + colW * 2 + 6, metaY + metaH + 5);

      // -----------------------------
      // TABLE LIGNES (compact)
      // -----------------------------
      const tableY = metaY + 44;
      const rowH = 16;

      const cols = [
        { key: "code", title: "Code", w: contentW * 0.14, align: "left" },
        { key: "description", title: "Description", w: contentW * 0.50, align: "left" },
        { key: "qty", title: "Qté", w: contentW * 0.08, align: "center" },
        { key: "puHt", title: "P.U. HT", w: contentW * 0.12, align: "right" },
        { key: "montantHt", title: "Montant HT", w: contentW * 0.12, align: "right" },
        { key: "tva", title: "TVA", w: contentW * 0.04, align: "right" },
      ];

      // header row
      let x = left;
      let y = tableY;
      doc.save();
      doc.rect(left, y, contentW, rowH).fill(GREEN).stroke();
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
      cols.forEach((cdef) => {
        doc.text(cdef.title, x + 4, y + 4, { width: cdef.w - 8, align: cdef.align });
        x += cdef.w;
      });
      doc.restore();

      // rows
      y += rowH;
      doc.font("Helvetica").fontSize(8.5).fillColor(DARK);

      const lines = docData.lines || [];

      for (const line of lines) {
        const isDetail = !!line.isDetail;
        const height = isDetail ? 28 : rowH;

        // stop overflow (on force 1 page)
        if (y + height > doc.page.height - 150) break;

        doc.rect(left, y, contentW, height).stroke();
        let xx = left;

        const cell = (val, w, align = "left", bold = false) => {
          doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(DARK);
          const txt = val === null || val === undefined ? "" : String(val);
          doc.text(txt, xx + 4, y + 4, { width: w - 8, align });
          xx += w;
        };

        cell(line.code || "", cols[0].w, "left", !isDetail);
        cell(line.description || "", cols[1].w, "left", isDetail);
        cell(line.qty === null ? "" : String(line.qty || ""), cols[2].w, "center");
        cell(line.puHt === null || line.puHt === "" ? "" : fmt2(line.puHt || 0), cols[3].w, "right");
        cell(String(line.montantHt || ""), cols[4].w, "right");
        cell(line.tva === null || line.tva === "" ? "" : fmt2(line.tva || 0), cols[5].w, "right");

        y += height;
      }

      // -----------------------------
      // MENTIONS + SIGNATURE + BLOCS BAS
      // -----------------------------
      const mentions = String(docData.devisMentions || "").trim();
      if (mentions) {
        doc.font("Helvetica").fontSize(7.5).fillColor(DARK);
        doc.text(mentions, left, y + 10, { width: contentW });
      }

      // bas de page (2 blocs)
      const bottomY = doc.page.height - 120;

      // TVA table (gauche)
      const t = docData.totals || { mensualiteHt: 0, totalTva: 0, totalTtc: 0 };
      const tvaBase = t.mensualiteHt;
      const tvaAmount = t.totalTva;

      const taxW = contentW * 0.50;
      const taxX = left;
      const taxRowH = 18;

      // header
      doc.save();
      doc.rect(taxX, bottomY, taxW, taxRowH).stroke();
      const taxColW = taxW / 3;
      for (let i = 0; i < 3; i++) doc.rect(taxX + taxColW * i, bottomY, taxColW, taxRowH).fillAndStroke(GREEN);
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8.5);
      doc.text("Taux", taxX + 6, bottomY + 5);
      doc.text("Base HT", taxX + taxColW + 6, bottomY + 5);
      doc.text("Montant TVA", taxX + taxColW * 2 + 6, bottomY + 5);
      doc.restore();

      // values
      doc.font("Helvetica").fontSize(8.5).fillColor(DARK);
      doc.rect(taxX, bottomY + taxRowH, taxW, taxRowH).stroke();
      doc.text("20,00", taxX + 6, bottomY + taxRowH + 5);
      doc.text(fmt2(tvaBase), taxX + taxColW + 6, bottomY + taxRowH + 5);
      doc.text(fmt2(tvaAmount), taxX + taxColW * 2 + 6, bottomY + taxRowH + 5);

      // Signature line (comme l’image)
      doc.font("Helvetica").fontSize(8.5).fillColor(DARK);
      doc.text("Pour le client (signature précédée de la mention :", taxX, bottomY + 44);
      doc.font("Helvetica-Bold").text("Lu et approuvé, bon pour accord)", taxX, bottomY + 56);

      // Totals box (droite)
      const boxW = contentW * 0.40;
      const boxX = left + contentW - boxW;
      const boxY = bottomY;

      const labels = [
        ["Mensualité HT", fmt2(t.mensualiteHt)],
        ["Total TVA", fmt2(t.totalTva)],
        ["Total TTC", fmt2(t.totalTtc)],
        ["Acomptes à régler", fmt2(0)],
        ["Mensualité TTC", `${fmt2(t.totalTtc)} €`],
      ];

      const lineH = 18;

      // cadre
      doc.rect(boxX, boxY, boxW, lineH * labels.length).stroke();

      let ly = boxY;
      labels.forEach(([lab, val], idx) => {
        doc.rect(boxX, ly, boxW * 0.60, lineH).fillAndStroke(GREEN);
        doc.rect(boxX + boxW * 0.60, ly, boxW * 0.40, lineH).stroke();

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8.5);
        doc.text(lab, boxX + 6, ly + 5, { width: boxW * 0.60 - 12 });

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(idx === labels.length - 1 ? 9.5 : 8.5);
        doc.text(val, boxX + boxW * 0.60 + 6, ly + 5, {
          width: boxW * 0.40 - 12,
          align: "right",
        });

        ly += lineH;
      });

      // footer
      doc.font("Helvetica").fontSize(7.5).fillColor(GREY);
      doc.text(
        "Siret : 93070650200018 - APE : 7311Z - N° TVA intracom : FR29930706502 - Capital : 10 000,00 €",
        left,
        doc.page.height - 28,
        { width: contentW, align: "center" }
      );

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

    const {
  client = {},
  pitchInstances = [],
  otherSelections = {}, // ✅ AJOUT
  validityDays = 30,
  finalType = "location_maintenance",
} = req.body || {};

const hasPitch = Array.isArray(pitchInstances) && pitchInstances.length > 0;
const hasOther = otherSelections && Object.keys(otherSelections).length > 0;

if (!hasPitch && !hasOther) {
  return res.status(400).json({ message: "Aucun produit sélectionné." });
}


 const { lines, totals, devisMentions } = await buildLinesAndTotals({
  pitchInstances,
  otherSelections,
  client,
  finalType,
});


   const devisNumber = await generateDevisNumber4();


    const saved = await AgentPdf.create({
      agentId: agent._id,
      client,
      devisNumber,
        pitchInstances,
          otherSelections,
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
