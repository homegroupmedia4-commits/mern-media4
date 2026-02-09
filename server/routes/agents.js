// server/routes/agents.js
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
const mongoose = require("mongoose");
const { PDFDocument: PDFLibDocument } = require("pdf-lib");

const ADMIN_UI_PASSWORD = process.env.ADMIN_UI_PASSWORD || "Homegroup91?";


router.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body || {};
    if (String(password || "") !== String(ADMIN_UI_PASSWORD)) {
      return res.status(401).json({ message: "Mot de passe admin invalide." });
    }

    // ✅ Token "admin" (pas lié à Agent)
    const token = jwt.sign(
      { admin: true, role: "superadmin" },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
    );

    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});



const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_TTL = "7d";

/**
 * ✅ Devis number: "DE01048"
 * - compteur incrémental "0001" -> "9999"
 * - atomic via MongoDB (sans créer de nouveau modèle)
 */
async function nextDevisNumberCounter4() {
  const coll = mongoose.connection.collection("counters");

  const r = await coll.findOneAndUpdate(
    { _id: "agent_devis" },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      returnDocument: "after",
      returnOriginal: false, // compat anciennes versions
    }
  );

  const doc = r?.value || r;
  const seq = Number(doc?.seq || 1);

  const n4 = String(Math.max(1, seq)).padStart(4, "0");
  return `DE${n4}`;
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

function guessFixationName(pi = {}) {
  if (pi.fixationName) return String(pi.fixationName);
  const id = String(pi.fixationId || "").toLowerCase();
  if (id === "plafond") return "Support plafond";
  if (id === "fixe") return "Support fixe";
  if (id === "special") return "Support spécial";
  return "Support plafond";
}

/**
 * ✅ Construit les lignes EXACTEMENT dans la logique de ton UI :
 * - Pitchs : codeProduit vient de PitchManager (row.codeProduit)
 * - Description pitch format:
 *   "P2.6 (500*500, 4500cd/m2,OSR2601) — 1x2m —
 *    384x769px — Écran Vitrine exposée rue ou
 *    événementiel (haute luminosité)"
 * - Autres produits : "NomProduit - XX pouces"
 * - PLAYER qty = nombre total de produits (pitch qty + autres qty)
 * - ABOBR qty = nombre total de produits (comme ton exemple 7) => montant = qty * 19.95
 * - INFO : qty "/" et colonnes "-"/"-"
 * - PORT/PARA : qty = total produits
 * - INST 2 lignes :
 *   - "INSTALLATION (Murs leds) - Support xxx" (PU 600) qty = total pitch qty
 *   - "INSTALLATION (Totems / Kiosques / Écrans\nmuraux) - Support xxx" (PU 300) qty = total autres qty
 * - Para detail sous la ligne PARA :
 *   "Devis mensuel sur la base d'un leasing de 63 mois
 *    avec garantie incluse"
 */
async function buildLinesAndTotals({
  pitchInstances = [],
  otherSelections = {},
  client = {},
  finalType = "location_maintenance",
}) {
  const tvaRate = 20;

  // -----------------------------
  // 1) PITCH LINES (mensualité)
  // -----------------------------
  const pitchLines = (pitchInstances || []).map((pi) => {
    const code = pi.codeProduit || pi.code || "—";

    // Champs venant de PitchManager / UI
   const nom = String(
  pi.pitchLabel || pi.name || pi.pitchName || pi.pitchTitle || ""
).trim();

    const dims = String(pi.dimensions || "").trim(); // ex: "500*500"
    const lumi = String(pi.luminosite || "").trim(); // ex: "4500cd/m2"
const cat = String(
  pi.categorieName || pi.categoryName || pi.category || pi.categorie || ""
).trim();


    const wM = pi.largeurM ? String(pi.largeurM).trim() : "";
    const hM = pi.hauteurM ? String(pi.hauteurM).trim() : "";
    const wPx = pi.largeurPx ? String(pi.largeurPx).trim() : "";
    const hPx = pi.hauteurPx ? String(pi.hauteurPx).trim() : "";

    // ✅ Description EXACTE (avec retours ligne comme l’image)
    // Ligne 1: "P2.6 (500*500, 4500cd/m2,OSR2601) — 1x2m —"
    // Ligne 2: "384x769px — Écran Vitrine exposée rue ou"
    // Ligne 3: "événementiel (haute luminosité)"
    const part1 = [
      nom || null,
      (dims || lumi || code !== "—") ? `(${[dims, lumi, code].filter(Boolean).join(",")})` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const part2 = wM && hM ? `${wM}x${hM}m` : "";
    const part3 = wPx && hPx ? `${wPx}x${hPx}px` : "";

    // split "Écran ..." en 2 lignes si long, comme ton exemple
    const ecranLabel = cat ? `Écran ${cat}` : "";
    const ecranTwoLines = ecranLabel
      ? ecranLabel.includes(" ou ")
        ? ecranLabel.replace(" ou ", " ou\n") // simple découpe “ou” comme dans l’image
        : ecranLabel
      : "";

    const description = [
      [part1, part2 ? `— ${part2} —` : null].filter(Boolean).join(" "),
      part3 ? `${part3} — ${ecranTwoLines}` : ecranTwoLines || "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    const qty = parseInt(pi.quantite || "1", 10) || 1;

    // ✅ On garde TES MONTANTS calculés front
    const puHt = Number(pi.prixTotalHtMois || 0) || 0;
    const montant = Number(pi.montantHt || 0) || 0;

    return {
      code,
      description: description || "—",
      qty,
      puHt,
      montantHt: fmt2(montant),
      tva: tvaRate,
      scope: "mensualite",
      kind: "pitch",
    };
  });

  const qtyPitchTotal = pitchLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

//   // -----------------------------
//   // 2) AUTRES PRODUITS (mensualité)
//   // -----------------------------
//   const otherMonthlyLines = [];

// const isOid = (v) => mongoose.Types.ObjectId.isValid(String(v));

// const checkedRowIds = [];
// const checkedMemIds = [];

// for (const pid of Object.keys(otherSelections || {})) {
//   const sel = otherSelections?.[pid];
//   const checked = sel?.checked || {};
//   for (const rowId of Object.keys(checked)) {
//     if (isOid(rowId)) checkedRowIds.push(rowId);

//     const memId = checked[rowId]?.memId;
//     if (memId && isOid(memId)) checkedMemIds.push(memId);
//   }
// }


//   const sizes = checkedRowIds.length
//     ? await OtherProductSize.find({ _id: { $in: checkedRowIds } }).lean()
//     : [];
//   const mems = checkedMemIds.length
//     ? await MemoryOption.find({ _id: { $in: checkedMemIds } }).lean()
//     : [];

//   const sizeById = new Map(sizes.map((s) => [String(s._id), s]));
//   const memById = new Map(mems.map((m) => [String(m._id), m]));

//   for (const pid of Object.keys(otherSelections || {})) {
//     const sel = otherSelections?.[pid];
//     const checked = sel?.checked || {};

//     for (const rowId of Object.keys(checked)) {
//       const line = checked[rowId];
//       const size = sizeById.get(String(rowId));
//       if (!size) continue;

//       const mem = line?.memId ? memById.get(String(line.memId)) : null;

//       const basePrice = Number(size.price || 0);
//       const memPrice = Number(mem?.price || 0);
//       const unit = basePrice + memPrice;

//       const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
//       const total = unit * qty;

//       // ✅ Description EXACTE : "NomProduit - XX pouces"
//       const productName = String(size.product || "Produit");
//       const inches = size.sizeInches ? `${size.sizeInches} pouces` : "";
//       const description = [productName, inches].filter(Boolean).join(" - ");

//       otherMonthlyLines.push({
//         code: size.productCode || size.codeProduit || "—",
//         description,
//         qty,
//         puHt: unit,
//         montantHt: fmt2(total),
//         tva: tvaRate,
//         scope: "mensualite",
//         kind: "other",
//       });
//     }
//   }


// -----------------------------
// 2) AUTRES PRODUITS (mensualité)
// -----------------------------
const otherMonthlyLines = [];

const isOid = (v) => mongoose.Types.ObjectId.isValid(String(v));

function getCheckedBucket(sel) {
  if (!sel) return {};
  if (sel.byMonths) {
    const months = String(sel.leasingMonths || "").trim();
    return sel.byMonths?.[months]?.checked || {};
  }
  return sel.checked || {};
}

const checkedRowIds = [];
const checkedMemIds = [];

for (const pid of Object.keys(otherSelections || {})) {
  const sel = otherSelections?.[pid];
  const checked = getCheckedBucket(sel);

  for (const rowId of Object.keys(checked || {})) {
    if (isOid(rowId)) checkedRowIds.push(rowId);

    const memId = checked[rowId]?.memId;
    if (memId && isOid(memId)) checkedMemIds.push(memId);
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
  const checked = getCheckedBucket(sel);

  for (const rowId of Object.keys(checked || {})) {
    const line = checked[rowId];
    const size = sizeById.get(String(rowId));
    if (!size) continue;

    const mem = line?.memId ? memById.get(String(line.memId)) : null;

    const basePrice = Number(size.price || 0);
    const memPrice = Number(mem?.price || 0);
    const unit = basePrice + memPrice;

    const qty = Math.max(1, parseInt(String(line?.qty || 1), 10) || 1);
    const total = unit * qty;

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
      kind: "other",
    });
  }
}


  const qtyOtherTotal = otherMonthlyLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const qtyTotalProducts = qtyPitchTotal + qtyOtherTotal; // ✅ PLAYER/ABOBR/PORT/PARA

  // -----------------------------
  // 3) PLAYER (visuel)
  // -----------------------------
  const playerLine =
    qtyTotalProducts > 0
      ? [
          {
            code: "NTB40",
            description: "PLAYER",
            qty: qtyTotalProducts,
            puHt: 0,
            montantHt: fmt2(0),
            tva: tvaRate,
            scope: "mensualite",
          },
        ]
      : [];

// -----------------------------
// 4) ABOBR (1 fois par devis)
// -----------------------------
const abobrLine =
  qtyTotalProducts > 0
    ? [
        {
          code: "ABOBR",
          description: "ABONNEMENT BRONZE LOGICIEL ET\nMAINTENANCE",
          qty: 1,
          puHt: 19.95,
          montantHt: fmt2(19.95),
          tva: tvaRate,
          scope: "mensualite",
        },
      ]
    : [];


  // -----------------------------
  // 5) INFO + hors mensualité
  // -----------------------------
  const infoLine =
    qtyTotalProducts > 0
      ? [
          {
            code: "INFO",
            description: "Non inclus dans la mensualité, facturation\nen sus :",
            qty: "/",
            puHt: "-",
            montantHt: "-",
            tva: "-",
            scope: "hors_mensualite",
            isInfo: true,
          },
        ]
      : [];

  const portOffert = normalizeBool(client.fraisPortOfferts);
  const instOffert = normalizeBool(client.fraisInstallationOfferts);
  const paraOffert = normalizeBool(client.fraisParametrageOfferts);

  const portQty = qtyTotalProducts;
  const paraQty = qtyTotalProducts;

const pi0 = pitchInstances?.[0] || {};
const fixationLabel = guessFixationName(pi0);
const fixationComment = String(pi0.fixationComment || "").trim();
const fixationSuffix = fixationComment ? ` — ${fixationComment}` : "";


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

  // ✅ 2 lignes INSTALLATION (comme ton image)
  const instLines = [];
  if (qtyPitchTotal > 0) {
    instLines.push({
      code: "INST",
      description: `INSTALLATION (Murs leds) - ${fixationLabel}${fixationSuffix}`,
      qty: qtyPitchTotal,
      puHt: 600,
      montantHt: instOffert ? "OFFERT" : fmt2(qtyPitchTotal * 600),
      tva: tvaRate,
      scope: "hors_mensualite",
    });
  }
  if (qtyOtherTotal > 0) {
    instLines.push({
      code: "INST",
      description: `INSTALLATION (Totems / Kiosques / Écrans\nmuraux) - ${fixationLabel}${fixationSuffix}`,
      qty: qtyOtherTotal,
      puHt: 300,
      montantHt: instOffert ? "OFFERT" : fmt2(qtyOtherTotal * 300),
      tva: tvaRate,
      scope: "hors_mensualite",
    });
  }

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

  // ✅ Détail sous PARA (comme l’image)
  const paraDetail = [];
  const leasingMonths =
    String(pitchInstances?.[0]?.financementMonths || client?.financementMonths || "63").trim() ||
    "63";

 if (qtyTotalProducts > 0) {
  let detail = `Devis mensuel sur la base d'un leasing de ${leasingMonths} mois\navec garantie incluse`;

  const clientComment = String(client?.commentaires || "").trim();
  if (clientComment) {
    detail += `\n\nCommentaires :\n${clientComment}`;
  }

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
    ...instLines,
    ...paraLine,
    ...paraDetail,
  ];

  return {
    lines,
    totals: { mensualiteHt, totalTva, totalTtc },
    devisMentions: buildDevisMentions({ finalType }),
  };
}

/**
 * ✅ PDF EXACT STYLE (image) :
 * - Logo à droite (même zone/échelle), bloc MEDIA4 à gauche
 * - "Devis" centré
 * - Meta table à gauche (1/2 largeur) : header vert + values sous (SANS doublon)
 * - Table lignes (mêmes colonnes, même style vert)
 * - Bas de page : tableau TVA (gauche) + bloc totaux (droite) + signature
 */

async function mergePdfBuffers(mainPdfBuffer, appendPdfBuffer) {
  const mainDoc = await PDFLibDocument.load(mainPdfBuffer);
  const appendDoc = await PDFLibDocument.load(appendPdfBuffer);

  const pages = await mainDoc.copyPages(appendDoc, appendDoc.getPageIndices());
  pages.forEach((p) => mainDoc.addPage(p));

  const mergedBytes = await mainDoc.save();
  return Buffer.from(mergedBytes);
}



function generateColoredDevisPdfBuffer({ docData }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 28 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const GREEN = "#8bc53f";
      const DARK = "#111111";
      const GREY = "#666666";

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;

      // -----------------------------
      // HEADER (MEDIA4 à gauche) + LOGO à droite (comme l’image)
      // -----------------------------
      const headerTopY = 22;

      // ✅ LOGO à droite
      const logoPath = path.join(__dirname, "..", "assets", "Media4logo.png");
      const logoW = 120;
      const logoH = 60;
      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, right - logoW, headerTopY + 2, { width: logoW, height: logoH });
        }
      } catch (e) {}

      // ✅ Bloc texte à gauche (gras comme l’exemple)
      doc.font("Helvetica-Bold").fillColor(DARK);
      doc.fontSize(14).text("SAS MEDIA4", left, headerTopY);
      doc.fontSize(9).text("1 Chemin du chêne rond", left, headerTopY + 16);
      doc.fontSize(9).text("91570 BIEVRES", left, headerTopY + 28);
      doc.fontSize(9).text("Tél : 01.85.41.01.00", left, headerTopY + 40);
      doc.fontSize(9).text("Site web : www.media4.fr", left, headerTopY + 52);

      // ✅ Y “après header” (on laisse respirer)
let cursorY = headerTopY + 70;


// -----------------------------
// BLOC "DEVIS" AU-DESSUS + CLIENT EN DESSOUS
// -----------------------------
const titleBaseY = cursorY;

const metaW = contentW * 0.5;
const gap = 18;
const clientX = left + metaW + gap;
const clientW = contentW - metaW - gap;

const c = docData.client || {};
const clientLines = [
  (c.societe || "").trim(),
  `${(c.adresse1 || "").trim()}` || "",
  `${(c.adresse2 || "").trim()}` || "",
  `${(c.codePostal || "").trim()} ${(c.ville || "").trim()}`.trim(),
  (c.nom || c.contactNom || "").trim() || "",
  (c.email || "").trim(),
  (c.telephone || "").trim(),
].filter(Boolean);

doc.font("Helvetica").fontSize(9).fillColor(DARK);
const clientText = clientLines.join("\n");

// ✅ 1) Titre "Devis" AU-DESSUS du bloc client
doc
  .font("Helvetica-Bold")
  .fontSize(16)
  .fillColor(DARK)
  .text("Devis", clientX, titleBaseY, { width: clientW, align: "center" });

// ✅ 2) Bloc client EN DESSOUS du titre
const titleToClientGap = 10; // ajuste si besoin
const clientY = titleBaseY + 18 + titleToClientGap;

doc.font("Helvetica").fontSize(9).fillColor(DARK);
doc.text(clientText, clientX, clientY, {
  width: clientW,
  align: "left",
  lineGap: 1.5,
});

// ✅ 3) cursorY après client
const clientH = doc.heightOfString(clientText, { width: clientW, lineGap: 1.5 });
cursorY = clientY + clientH + 12;



      // -----------------------------
      // TABLE META (Numéro / Date / Durée) à gauche (1/2 largeur)
      // -----------------------------
      const devisNumber = String(docData.devisNumber || "").trim(); // ex: "DE01048"
      const num = devisNumber || "DE????";
      const dateStr = (() => {
        try {
          // si docData.createdAt existe, on l’utilise ; sinon date du jour
          const d = docData.createdAt ? new Date(docData.createdAt) : new Date();
          return d.toLocaleDateString("fr-FR");
        } catch {
          return new Date().toLocaleDateString("fr-FR");
        }
      })();
      const validity = `${docData.validityDays || 30} jours`;

    const metaY = cursorY; // ✅ plus “collé”, dynamique

    const metaH = 18;
const metaX = left;
const colW = metaW / 3;


     cursorY = metaY + metaH * 2 + 18; // ✅ espace sous meta


      // header (✅ sans doublon)
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

      // values row
      doc.save();
      doc.rect(metaX, metaY + metaH, metaW, metaH).stroke();
      // séparateurs verticaux
      doc.moveTo(metaX + colW, metaY + metaH).lineTo(metaX + colW, metaY + metaH * 2).stroke();
      doc.moveTo(metaX + colW * 2, metaY + metaH).lineTo(metaX + colW * 2, metaY + metaH * 2).stroke();
      doc.restore();

      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(num, metaX + 6, metaY + metaH + 5);
      doc.text(dateStr, metaX + colW + 6, metaY + metaH + 5);
      doc.text(validity, metaX + colW * 2 + 6, metaY + metaH + 5);

      // -----------------------------
      // TABLE LIGNES
      // -----------------------------
      const tableY = cursorY;
      const rowH = 22;

    const cols = [
  { key: "code", title: "Code", w: contentW * 0.14, align: "left" },
  { key: "description", title: "Description", w: contentW * 0.48, align: "left" },
  { key: "qty", title: "Qté", w: contentW * 0.08, align: "center" },
  { key: "puHt", title: "P.U. HT", w: contentW * 0.11, align: "right" },
  { key: "montantHt", title: "Montant HT", w: contentW * 0.13, align: "right" },
  { key: "tva", title: "TVA", w: contentW * 0.06, align: "right" }, // ✅ plus large
];


      // header row
      let x = left;
      let y = tableY;

      doc.save();
      doc.rect(left, y, contentW, rowH).fill(GREEN).stroke();
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
      cols.forEach((cdef) => {
        doc.text(cdef.title, x + 4, y + 7, { width: cdef.w - 8, align: cdef.align });
        x += cdef.w;
      });
      doc.restore();

      // rows
      y += rowH;

      const lines = docData.lines || [];
      for (const line of lines) {
        const isDetail = !!line.isDetail;
        const isInfo = !!line.isInfo;

        // ✅ Hauteur dynamique selon le contenu (évite que ça déborde)
const paddingY = 16; // marge verticale interne
const minH = isDetail ? 40 : 28;

const descFont = (isInfo || isDetail) ? "Helvetica-Bold" : "Helvetica";
const descSize = 8.7;

doc.font(descFont).fontSize(descSize);
const descH = doc.heightOfString(String(line.description || ""), {
  width: cols[1].w - 8,
  lineGap: 1.2,
});

doc.font("Helvetica").fontSize(descSize);
const codeH = doc.heightOfString(String(line.code || ""), { width: cols[0].w - 8, lineGap: 1.2 });

const height = Math.max(minH, Math.ceil(Math.max(descH, codeH) + paddingY));


        // garde un bas de page identique à l’image
       const bottomY = pageH - 120;
const stopY = bottomY - 10; // ✅ garde une marge avant les blocs du bas

        if (y + height > stopY) break;

        // row border
        doc.rect(left, y, contentW, height).stroke();

        // separators
        let xx = left;
        cols.forEach((cdef) => {
          doc.moveTo(xx, y).lineTo(xx, y + height).stroke();
          xx += cdef.w;
        });
        doc.moveTo(left + contentW, y).lineTo(left + contentW, y + height).stroke();

     const cell = (val, w, align = "left", bold = false, size = 8.7) => {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(DARK);
  const txt = val === null || val === undefined ? "" : String(val);
  doc.text(txt, xx + 4, y + 8, { width: w - 8, align, lineGap: 1.2 });
  xx += w;
};


        xx = left;

        // style (INFO en gras)
        const boldRow = isInfo;

        cell(line.code || "", cols[0].w, "left", boldRow, 8.7);
        cell(line.description || "", cols[1].w, "left", boldRow || isDetail, 8.7);
        cell(line.qty === null ? "" : String(line.qty || ""), cols[2].w, "center", boldRow, 8.7);

        const pu = line.puHt === "-" ? "-" : line.puHt === "" ? "" : line.puHt === null ? "" : fmt2(line.puHt || 0);
        cell(pu, cols[3].w, "right", boldRow, 8.7);

        cell(String(line.montantHt || ""), cols[4].w, "right", boldRow, 8.7);
        const tvaTxt =
  line.tva === "-" || line.tva === "" || line.tva === null || line.tva === undefined
    ? (line.tva === "-" ? "-" : "")
    : fmt2(line.tva);

cell(tvaTxt, cols[5].w, "right", boldRow, 8.7);


        y += height;
      }

      // -----------------------------
      // Mentions sous le tableau
      // -----------------------------
     // -----------------------------
// Mentions sous le tableau
// -----------------------------
let afterMentionsY = y;

const mentions = String(docData.devisMentions || "").trim();
if (mentions) {
  doc.font("Helvetica").fontSize(8).fillColor(DARK);
  doc.text(mentions, left, y + 6, { width: contentW });
  afterMentionsY = y + 6 + doc.heightOfString(mentions, { width: contentW });
}

// -----------------------------
// BAS DE PAGE (plus proche des mentions)
// -----------------------------
const minBottomY = pageH - 120;          // look par défaut
const desiredBottomY = afterMentionsY + 10; // ✅ plus près
const bottomY = Math.min(minBottomY, desiredBottomY);


      // TVA table (gauche)
      const t = docData.totals || { mensualiteHt: 0, totalTva: 0, totalTtc: 0 };
      const taxW = contentW * 0.50;
      const taxX = left;
      const taxRowH = 18;

      doc.save();
      doc.rect(taxX, bottomY, taxW, taxRowH).stroke();
      const taxColW = taxW / 3;
      for (let i = 0; i < 3; i++) doc.rect(taxX + taxColW * i, bottomY, taxColW, taxRowH).fillAndStroke(GREEN);
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
      doc.text("Taux", taxX + 6, bottomY + 5);
      doc.text("Base HT", taxX + taxColW + 6, bottomY + 5);
      doc.text("Montant TVA", taxX + taxColW * 2 + 6, bottomY + 5);
      doc.restore();

      doc.save();
      doc.rect(taxX, bottomY + taxRowH, taxW, taxRowH).stroke();
      doc.moveTo(taxX + taxColW, bottomY + taxRowH).lineTo(taxX + taxColW, bottomY + taxRowH * 2).stroke();
      doc.moveTo(taxX + taxColW * 2, bottomY + taxRowH).lineTo(taxX + taxColW * 2, bottomY + taxRowH * 2).stroke();
      doc.restore();

      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text("20,00", taxX + 6, bottomY + taxRowH + 5);
      doc.text(fmt2(t.mensualiteHt), taxX + taxColW + 6, bottomY + taxRowH + 5);
      doc.text(fmt2(t.totalTva), taxX + taxColW * 2 + 6, bottomY + taxRowH + 5);

      // Signature (gauche sous TVA)
      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text("Pour le client (signature précédée de la", taxX, bottomY + 44);
      doc.font("Helvetica-Bold").text("mention : Lu et approuvé, bon pour accord)", taxX, bottomY + 56);

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
      doc.rect(boxX, boxY, boxW, lineH * labels.length).stroke();

      let ly = boxY;
      labels.forEach(([lab, val], idx) => {
        doc.rect(boxX, ly, boxW * 0.60, lineH).fillAndStroke(GREEN);
        doc.rect(boxX + boxW * 0.60, ly, boxW * 0.40, lineH).stroke();

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9);
        doc.text(lab, boxX + 6, ly + 5, { width: boxW * 0.60 - 12 });

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(idx === labels.length - 1 ? 10 : 9);
        doc.text(val, boxX + boxW * 0.60 + 6, ly + 5, {
          width: boxW * 0.40 - 12,
          align: "right",
        });

        ly += lineH;
      });

      // footer
      doc.font("Helvetica").fontSize(8).fillColor(GREY);
      doc.text(
        "Siret : 93070650200018 - APE : 7311Z - N° TVA intracom : FR29930706502 - Capital : 10 000,00 €",
        left,
        pageH - 28,
        { width: contentW, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

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

    // ✅ CAS ADMIN (token non lié à Agent)
    if (payload?.admin === true) {
      req.agent = {
        _id: null,
        nom: "ADMIN",
        prenom: "",
        email: "",
        role: payload.role || "superadmin",
        isAdminToken: true,
      };
      return next();
    }

    // ✅ CAS AGENT NORMAL
    const agent = await Agent.findById(payload.agentId).select("_id nom prenom email role");
    if (!agent) return res.status(404).json({ message: "Agent introuvable." });

    req.agent = agent;
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}


function requireAdmin(req, res, next) {
  const role = String(req.agent?.role || "");
  const isAdmin = ["admin", "superadmin"].includes(role) || req.agent?.isAdminToken;
  if (!isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
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
// ✅ LISTE devis (agent ou superadmin)
router.get("/devis", requireAgentAuth, async (req, res) => {
  try {
    const { tab = "all", q = "", agentId = "" } = req.query;

    const isAdmin = ["admin", "superadmin"].includes(String(req.agent.role || ""));

    // ✅ superadmin => voit tout (ou filtre agentId si fourni)
    // ✅ agent normal => voit seulement ses devis
    const query = isAdmin
      ? (agentId ? { agentId } : {})
      : { agentId: req.agent._id };

    // filtre tab
    if (tab === "murs_leds") query.pitchInstances = { $exists: true, $not: { $size: 0 } };

    if (tab === "autres_produits") {
      query.$or = [
        { pitchInstances: { $exists: false } },
        { pitchInstances: { $size: 0 } },
      ];
    }

    // recherche
    const s = String(q || "").trim();
    if (s) {
      query.$or = [
        { devisNumber: { $regex: s, $options: "i" } },
        { "client.nom": { $regex: s, $options: "i" } },
        { "client.prenom": { $regex: s, $options: "i" } },
        { "client.societe": { $regex: s, $options: "i" } },
        { "client.email": { $regex: s, $options: "i" } },
      ];
    }

    const rows = await AgentPdf.find(query).sort({ createdAt: -1 }).lean();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).send("Erreur serveur (liste devis).");
  }
});


// ✅ Liste agents pour filtre “Tous les utilisateurs”
router.get("/agents-lite", requireAgentAuth, async (req, res) => {
  try {
    const isAdmin = ["admin", "superadmin"].includes(String(req.agent.role || ""));


    if (!isAdmin) return res.status(403).json({ message: "Forbidden" });

    const agents = await Agent.find({})
      .select("_id nom prenom email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(agents);
  } catch (e) {
    console.error(e);
    res.status(500).send("Erreur serveur (agents-lite).");
  }
});



// ✅ POST /api/agents/devis (enregistrer devis JSON)
router.post("/devis", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;

    let {
  client = {},
  pitchInstances = [],
  otherSelections = {},
  validityDays = 30,
  finalType = "location_maintenance",
} = req.body || {};

// ✅ fallback: si front n’envoie pas finalType, on prend celui du 1er pitch
if (
  (!finalType || finalType === "location_maintenance") &&
  Array.isArray(pitchInstances) &&
  pitchInstances[0]?.typeFinancement
) {
  finalType = String(pitchInstances[0].typeFinancement).trim() || finalType;
}


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

    // ✅ numéro type "DE01048"
    const devisNumber = await nextDevisNumberCounter4();

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

    return res.json({ ok: true, devisId: saved._id, devisNumber });
   } catch (e) {
    console.error("SAVE DEVIS ERROR:", e?.message);
    console.error(e?.stack);
    return res.status(500).json({ message: "Erreur save devis." });
  }

});

// ✅ POST /api/agents/devis/:id/pdf (génère pdf couleur et stocke)
router.post("/devis/:id/pdf", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;
    const docData = await AgentPdf.findById(req.params.id);
    if (!docData) return res.status(404).json({ message: "Devis introuvable." });
   const isAdmin = ["admin", "superadmin"].includes(String(agent.role || "")) || agent.isAdminToken;
if (!isAdmin && String(docData.agentId) !== String(agent._id)) {
  return res.status(403).json({ message: "Forbidden" });
}


    // const pdfBuffer = await generateColoredDevisPdfBuffer({ docData });

    // docData.pdfBuffer = pdfBuffer;

    const pdfBufferDevis = await generateColoredDevisPdfBuffer({ docData });

// ✅ charge le CGV depuis le disque
const cgvPath = path.join(__dirname, "..", "assets", "CGV-location-maintenance.pdf");
const cgvBuffer = fs.readFileSync(cgvPath);

// ✅ merge => devis + 3 pages CGV
const mergedBuffer = await mergePdfBuffers(pdfBufferDevis, cgvBuffer);

docData.pdfBuffer = mergedBuffer;




    docData.contentType = "application/pdf";
    docData.pages = 4;
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

// ✅ GET /api/agents/devis/:id/pdf (serve le PDF)
router.get("/devis/:id/pdf", requireAgentAuth, async (req, res) => {
  try {
    const agent = req.agent;
    const doc = await AgentPdf.findById(req.params.id);
    if (!doc) return res.status(404).send("Not found");
    if (String(doc.agentId) !== String(agent._id)) return res.status(403).send("Forbidden");
    if (!doc.pdfBuffer) return res.status(400).send("PDF not generated");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="devis-${doc.devisNumber || doc._id}.pdf"`
    );
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

    if (String(doc.agentId) !== String(agent._id)) return res.status(403).send("Forbidden");

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
    const list = await Agent.find().sort({ createdAt: -1 }).select("_id nom prenom email");
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

    if (!e || !p) return res.status(400).json({ message: "Email et mot de passe requis." });

    const agent = await Agent.findOne({ email: e });
    if (!agent) return res.status(401).json({ message: "Identifiants invalides." });

    const ok = await bcrypt.compare(p, agent.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides." });

    const token = jwt.sign({ agentId: agent._id }, JWT_SECRET, { expiresIn: TOKEN_TTL });

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
router.get("/admin/list", async (req, res) => {
  try {
    const agents = await Agent.find()
  .sort({ createdAt: -1 })
  .populate("parrainId", "_id nom prenom email")
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

// ✅ UPDATE agent (admin only)
router.put("/admin/agents/:id", requireAgentAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const allowed = [
      "nom",
      "prenom",
      "email",
      "parrainId",
      "societe",
      "siret",
      "adresse",
      "codePostal",
      "ville",
      "telephonePortable",
      "telephoneFixe",
      "pays",
      "role",
    ];

    const patch = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }

    // normalisations
    if (patch.email) patch.email = String(patch.email).toLowerCase().trim();
    if (patch.parrainId === "" || patch.parrainId === null) patch.parrainId = null;

    const updated = await Agent.findByIdAndUpdate(id, patch, { new: true })
      .populate("parrainId", "_id nom prenom email")
      .lean();

    if (!updated) return res.status(404).json({ message: "Agent introuvable." });

    return res.json(updated);
  } catch (e) {
    console.error(e);
    // cas email unique
    if (String(e?.code) === "11000") {
      return res.status(409).json({ message: "Email déjà utilisé." });
    }
    return res.status(500).json({ message: "Erreur serveur (update agent)." });
  }
});


module.exports = router;
