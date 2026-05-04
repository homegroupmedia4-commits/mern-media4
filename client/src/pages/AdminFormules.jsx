// client/src/pages/AdminFormules.jsx
import React, { useMemo, useState } from "react";

const TabBtn = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      appearance: "none",
      border: "1px solid #e5e7eb",
      background: active ? "#111827" : "#fff",
      color: active ? "#fff" : "#111827",
      padding: "10px 12px",
      borderRadius: 10,
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 13,
      lineHeight: 1,
      boxShadow: active ? "0 8px 18px rgba(17,24,39,0.18)" : "none",
      transition: "all 120ms ease",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
);

const Card = ({ children }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 16,
      boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
    }}
  >
    {children}
  </div>
);

const Badge = ({ children, color = "#f3f4f6" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      background: color,
      border: "1px solid #e5e7eb",
      fontSize: 12,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    {children}
  </span>
);

const Small = ({ children }) => (
  <span style={{ fontSize: 12, color: "#6b7280" }}>{children}</span>
);

const SectionTitle = ({ title, right }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 12,
      marginBottom: 10,
    }}
  >
    <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>{title}</div>
    {right ? <div>{right}</div> : null}
  </div>
);

const AlertBox = ({ children, color = "#fffbe6", border = "#ffe58f" }) => (
  <div
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      background: color,
      border: `1px solid ${border}`,
      fontSize: 13,
      marginTop: 10,
    }}
  >
    {children}
  </div>
);

const Table = ({ columns = [], rows = [] }) => {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  background: "#f9fafb",
                  color: "#111827",
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "10px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ background: idx % 2 ? "#fff" : "#fcfcfd" }}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "10px 12px",
                    fontSize: 13,
                    borderBottom: idx === rows.length - 1 ? "none" : "1px solid #f1f5f9",
                    verticalAlign: "top",
                    whiteSpace: "pre-wrap",
                    fontFamily: c.mono ? "monospace" : "inherit",
                  }}
                >
                  {r?.[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>
                Aucune donnée.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

export default function AdminFormules() {
  const [tab, setTab] = useState("pitch");

  const tabs = useMemo(
    () => [
      { key: "pitch", label: "1) Murs leds (Pitch)" },
      { key: "finition", label: "2) Finition pitch" },
      { key: "options", label: "3) Options de financement" },
      { key: "other", label: "4) Autres produits" },
      { key: "recap", label: "5) Récap total" },
      { key: "defaults", label: "6) Defaults & helpers" },
    ],
    []
  );

  // ─── TAB 1 : Pitch ───────────────────────────────────────────────────────────
  const pitchTables = useMemo(() => {
    const tA = {
      title: "A) Entrées + dimensions de base",
      columns: [
        { key: "input", label: "Entrée" },
        { key: "formula", label: "Formule exacte" },
        { key: "output", label: "Sortie" },
      ],
      rows: [
        {
          input: "largeurM",
          formula: "L = toNum(largeurM)\n→ Number(String(v).replace(',','.'))",
          output: "L (Number)",
        },
        {
          input: "hauteurM",
          formula: "H = toNum(hauteurM)",
          output: "H (Number)",
        },
        {
          input: "L, H",
          formula: "surface = L * H",
          output: "surfaceM2 (m²)",
        },
        {
          input: "L, H",
          formula: "diagonaleCm_raw = sqrt(L² + H²) * 100",
          output: "—",
        },
        {
          input: "diagonaleCm_raw",
          formula: "pouces_raw = diagonaleCm_raw / 2.54",
          output: "—",
        },
        {
          input: "diagonaleCm_raw / pouces_raw",
          formula: "roundDimLikeCF7(n) :\n  frac = n - floor(n)\n  frac >= 0.51 ? ceil(n) : floor(n)",
          output: "pi.diagonaleCm\npi.pouces",
        },
      ],
    };

    const tB = {
      title: "B) Pitch mm → Pixels",
      columns: [
        { key: "step", label: "Étape" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          step: "Extraction pitch mm",
          formula: 'parsePitchMmFromLabel(pitchLabel)\n→ regex /P\\s*([0-9]*\\.?[0-9]+)/i\nEx: "P3.91" → 3.91',
          note: "0 si absent",
        },
        {
          step: "Condition",
          formula: "hasDims = (L > 0 && H > 0)",
          note: "px vides si pas de dims",
        },
        {
          step: "largeurPx",
          formula: "!hasDims → ''\npitchMm > 0 → floor((L*1000) / pitchMm)\nsinon → '—'",
          output: "pi.largeurPx",
        },
        {
          step: "hauteurPx",
          formula: "!hasDims → ''\npitchMm > 0 → floor((H*1000) / pitchMm)\nsinon → '—'",
          output: "pi.hauteurPx",
        },
      ],
    };

    const tC = {
      title: "C) Linéaire minimum + container",
      columns: [
        { key: "item", label: "Élément" },
        { key: "formula", label: "Formule exacte" },
        { key: "default", label: "Valeur" },
      ],
      rows: [
        {
          item: "SPECIAL_GROUP",
          formula: '"Exterieur haute luminosité"',
          default: "constante",
        },
        {
          item: "minLineaire",
          formula: "(categorieName === SPECIAL_GROUP) ? 5 : 2.5",
          default: "5 ou 2.5",
        },
        {
          item: "lineaireUsed",
          formula: "max(minLineaire, toNum(lineaireRaw, 0))",
          default: "≥ minLineaire",
        },
        {
          item: "container",
          formula: "lineaireUsed * 2 * option_ecran",
          default: "option_ecran=100\n→ lineaireUsed * 200",
        },
      ],
    };

    const tD = {
      title: "D) Frais annexes (minimums garantis)",
      columns: [
        { key: "item", label: "Frais" },
        { key: "formula", label: "Formule exacte" },
      ],
      rows: [
        {
          item: "tirage",
          formula: "max(option_tirage * surface, 250)",
        },
        {
          item: "livraison",
          formula: "max(option_livraison * surface, 300)",
        },
        {
          item: "install",
          formula: "max(prix_instal * surface, 750)",
        },
      ],
    };

    const tE = {
      title: "E) Coûts + Leasing + Résultat final",
      columns: [
        { key: "bloc", label: "Bloc" },
        { key: "formula", label: "Formule exacte" },
        { key: "sortie", label: "Sortie" },
      ],
      rows: [
        {
          bloc: "total_accessoires",
          formula: "accessoires_players + cout_locaux_chine_france",
          sortie: "total_accessoires",
        },
        {
          bloc: "total_pieces",
          formula: "surface * 0.1 * prixPitch * droits_de_douanes",
          sortie: "total_pieces",
        },
        {
          bloc: "total_ecran",
          formula: "(prixPitch + container) * surface",
          sortie: "total_ecran",
        },
        {
          bloc: "total_brut",
          formula: "total_ecran + total_accessoires + total_pieces",
          sortie: "total_brut",
        },
        {
          bloc: "total_eur",
          formula: "(total_brut / euros_dollars)\n+ install\n+ (option_ecran * surface)\n+ livraison\n+ tirage",
          sortie: "total_eur",
        },
        {
          bloc: "step1",
          formula: "total_eur / cout_leasing",
          sortie: "step1",
        },
        {
          bloc: "step2",
          formula: "step1 / marge_catalogue",
          sortie: "step2 (base de calcul)",
        },
        {
          bloc: "prix_mensuel",
          formula: "duree = max(1, int(dureeMonths))\nprix_mensuel = step2 / duree",
          sortie: "quote.total (location)",
        },
        {
          bloc: "prix_achat",
          formula: "step2 * 0.6",
          sortie: "quote.total (achat)",
        },
        {
          bloc: "totalArrondi",
          formula: "round(prix_mensuel ou prix_achat)",
          sortie: "quote.total (String)",
        },
        {
          bloc: "montantHt",
          formula: "q = max(1, int(quantite))\nmontantHt = q * totalArrondi",
          sortie: "quote.montant (String xx.xx)",
        },
      ],
    };

    return [tA, tB, tC, tD, tE];
  }, []);

  // ─── TAB 2 : Finition ────────────────────────────────────────────────────────
  const finitionTable = useMemo(() => ({
    title: "Calcul finition progressive (AgentHome.jsx → updatePitchInstance)",
    columns: [
      { key: "step", label: "Étape" },
      { key: "formula", label: "Formule exacte" },
      { key: "note", label: "Note" },
    ],
    rows: [
      {
        step: "surface",
        formula: "surface = Number(quote.surfaceM2 || 0)",
        note: "En m²",
      },
      {
        step: "prixM2",
        formula: "prixM2 = Number(next.finitionPriceMonthlyHt || 0)",
        note: "Prix finition par m²/mois",
      },
      {
        step: "finitionTotal",
        formula: "si surface > 0 :\n  finitionTotal = prixM2\n    + max(0, surface - 1) * (prixM2 * 0.5)\nsinon :\n  finitionTotal = 0",
        note: "Progressive : 1er m² plein prix,\nchaque m² suivant = +50% du prix/m²",
      },
      {
        step: "prixTotalHtMois",
        formula: "quote.total + finitionTotal",
        note: "Prix unitaire affiché (par écran)",
      },
      {
        step: "montantHt",
        formula: "qScreens = max(1, int(next.quantite))\nmontantHt = quote.montant + (finitionTotal * qScreens)",
        note: "Montant total HT (avec quantité)",
      },
    ],
  }), []);

  // ─── TAB 3 : Options de financement ─────────────────────────────────────────
  const optionsTables = useMemo(() => {
    const tPitch = {
      title: "Options pitch — prix pré-calculés (AgentHome.jsx → handleValider)",
      columns: [
        { key: "opt", label: "Option" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          opt: "Toute durée (ex: 36, 48…)",
          formula: "q = computePitchQuote({\n  dureeMonths: opt,\n  typeFinancement: 'location_maintenance',\n  quantite: '1', ...autres champs identiques\n})\noptionsFinancementPrices[opt] = floor(q.total + finitionMonthly)",
          note: "finitionMonthly = formule progressive (surface, prixM2Fin)\nfloor() = arrondi inférieur",
        },
        {
          opt: "achat",
          formula: "q = computePitchQuote({\n  typeFinancement: 'achat',\n  dureeMonths: pi.financementMonths, ...\n})\noptionsFinancementPrices['achat'] = floor(q.total + finitionMonthly)",
          note: "Formule achat = step2 * 0.6\nfinitionMonthly incluse",
        },
      ],
    };

    const tOther = {
      title: "Options autres produits — prix pré-calculés (AgentHome.jsx → handleValider)",
      columns: [
        { key: "opt", label: "Option" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          opt: "Toute durée (ex: 36, 48…)",
          formula: "targetRow = otherSizesCatalog.find(r =>\n  même productId + même sizeInches\n  + r.leasingMonths === opt\n)\nsi targetRow trouvé :\n  optionPrices[opt] = targetRow.price + memPrice\nsinon fallback :\n  monthly = row.price + memPrice\n  selectedMonths = int(months)\n  optionPrices[opt] = floor((monthly * selectedMonths) / int(opt))",
          note: "Utilise le vrai prix DB si disponible\nFallback = linéaire",
        },
        {
          opt: "achat",
          formula: "monthly = row.price + memPrice\nselectedMonths = max(1, int(months))\noptionPrices['achat'] = floor((monthly * selectedMonths) * 0.6)",
          note: "Achat = total durée sélectionnée * 0.6",
        },
      ],
    };

    const tPdf = {
      title: "Affichage dans le PDF (agents.js → buildLinesAndTotals)",
      columns: [
        { key: "opt", label: "Option" },
        { key: "formula", label: "Formule (fallback si precomputed absent)" },
      ],
      rows: [
        {
          opt: "Durée (pitch)",
          formula: "precomputed[opt] présent → Number(precomputed[opt])\nsinon → floor(baseMensuel * baseMonths / months)",
        },
        {
          opt: "Achat (pitch)",
          formula: "precomputed['achat'] présent → Number(precomputed['achat'])\nsinon → floor(baseMensuel * baseMonths * 0.6)",
        },
        {
          opt: "Durée (autres)",
          formula: "line.optionsFinancementPrices[opt] présent → Number(precomputed[opt])\nsinon → floor(unitBase * selectedMonths / months)",
        },
        {
          opt: "Achat (autres)",
          formula: "line.optionsFinancementPrices['achat'] présent → Number(precomputed['achat'])\nsinon → floor(unitBase * selectedMonths * 0.6)",
        },
      ],
    };

    return [tPitch, tOther, tPdf];
  }, []);

  // ─── TAB 4 : Autres produits ─────────────────────────────────────────────────
  const otherTables = useMemo(() => {
    const t1 = {
      title: "computeOtherLine() — prix unitaire + total (AgentOtherProductsBlock.jsx)",
      columns: [
        { key: "step", label: "Étape" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          step: "memPrice",
          formula: "memOptions.find(m => m._id === memId)?.price ?? 0",
          note: "0 si introuvable",
        },
        {
          step: "monthly",
          formula: "Number(basePrice) + Number(memPrice)",
          note: "Mensualité base (location)",
        },
        {
          step: "months",
          formula: "max(1, int(leasingMonths))",
          note: "Durée sélectionnée",
        },
        {
          step: "unit",
          formula: "typeFinancement === 'achat'\n  ? (monthly * months) * 0.6\n  : monthly",
          note: "Achat = total durée * 0.6\nLocation = mensualité directe",
        },
        {
          step: "q",
          formula: "max(1, int(qty))",
          note: "Quantité",
        },
        {
          step: "total",
          formula: "unit * q",
          note: "Montant HT ligne",
        },
      ],
    };

    const t2 = {
      title: "Structure de sélection par produit (byMonths)",
      columns: [
        { key: "key", label: "Clé" },
        { key: "shape", label: "Structure" },
        { key: "utilite", label: "Utilité" },
      ],
      rows: [
        {
          key: "otherSelections[productId]",
          shape: "{\n  leasingMonths,\n  typeFinancement,\n  optionsFinancement[],\n  byMonths\n}",
          utilite: "Config globale par produit",
        },
        {
          key: "byMonths[months]",
          shape: "{ checked: { [rowId]: { memId, qty } } }",
          utilite: "Checkboxes isolées par durée\n(changer la durée ne supprime pas les selections)",
        },
        {
          key: "byMonths[months].checked[rowId].optionsFinancementPrices",
          shape: "{ '36': 120, '48': 100, 'achat': 3500 }",
          utilite: "Prix pré-calculés envoyés au backend\n(ajoutés dans handleValider)",
        },
      ],
    };

    return [t1, t2];
  }, []);

  // ─── TAB 5 : Récap total ─────────────────────────────────────────────────────
  const recapTables = useMemo(() => {
    const t1 = {
      title: "Addition des montants (AgentHome.jsx → recap useMemo)",
      columns: [
        { key: "part", label: "Partie" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          part: "HT autres produits",
          formula: "Pour chaque rowId :\n  monthly = basePrice + memPrice\n  monthsInt = max(1, int(months))\n  typeFin = sel.typeFinancement\n  unit = (typeFin === 'achat') ? (monthly*monthsInt)*0.6 : monthly\n  qty = max(1, int(line.qty))\n  ht += unit * qty",
          note: "Recalcul brut côté récap\n(même logique que computeOtherLine)",
        },
        {
          part: "HT murs leds",
          formula: "ht += parseEuro(pi.montantHt)",
          note: "montantHt déjà calculé\n(inclut finition progressive)",
        },
        {
          part: "ABOBR",
          formula: "hasAnyLine = pitchInstances.some(pi => montantHt > 0)\n  OR Object.keys(otherSelections).length > 0\nsi hasAnyLine => ht += 19.95",
          note: "Charge fixe mensuelle",
        },
        {
          part: "TVA",
          formula: "tva = ht * 0.2",
          note: "20%",
        },
        {
          part: "TTC",
          formula: "ttc = ht + tva",
          note: "Mensualité TTC affichée",
        },
      ],
    };

    const t2 = {
      title: "Totaux PDF (agents.js → buildLinesAndTotals)",
      columns: [
        { key: "item", label: "Élément" },
        { key: "formula", label: "Formule exacte" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          item: "mensualiteBase",
          formula: "pitchLines.reduce(round2(montantHt))\n+ otherMonthlyLines.reduce(round2(montantHt))\n+ finishMonthlyLines.reduce(round2(montantHt))\n+ abobrTotal",
          note: "round2 = round(n*100)/100",
        },
        {
          item: "abobrTotal",
          formula: "isAchatGlobal ? 0 : 19.95",
          note: "Absent si type=achat global",
        },
        {
          item: "totalTva",
          formula: "mensualiteBase * 0.2",
          note: "",
        },
        {
          item: "totalTtc",
          formula: "mensualiteBase + totalTva",
          note: "",
        },
        {
          item: "fraisAnnexesHt",
          formula: "PORT + INSTALLATION(s) + PARAMÉTRAGE\n(OFFERT = 0)",
          note: "Hors mensualité",
        },
        {
          item: "fraisAnnexesTtc",
          formula: "fraisAnnexesHt * 1.2",
          note: "",
        },
        {
          item: "acompte (location)",
          formula: "(fraisAnnexesTtc * acomptePercent) / 100\nacomptePercent = client.acomptePercent ?? 50",
          note: "50% par défaut",
        },
        {
          item: "acompte (achat)",
          formula: "0",
          note: "Pas d'acompte en achat",
        },
      ],
    };

    return [t1, t2];
  }, []);

  // ─── TAB 6 : Defaults ────────────────────────────────────────────────────────
  const defaultsTables = useMemo(() => {
    const t1 = {
      title: "DEFAULT_STATIC — valeurs utilisées si /api/static-values échoue",
      columns: [
        { key: "k", label: "Clé" },
        { key: "v", label: "Valeur défaut" },
        { key: "role", label: "Rôle dans la formule" },
      ],
      rows: [
        { k: "accessoires_players", v: "800", role: "Ajouté au total_accessoires" },
        { k: "cout_locaux_chine_france", v: "1000", role: "Ajouté au total_accessoires" },
        { k: "cout_leasing", v: "0.7", role: "total_eur / cout_leasing = step1" },
        { k: "marge_catalogue", v: "0.7", role: "step1 / marge = step2" },
        { k: "droits_de_douanes", v: "1.14", role: "total_pieces *= droits_de_douanes" },
        { k: "euros_dollars", v: "1.07", role: "total_brut / euros_dollars" },
        { k: "option_ecran", v: "100", role: "container = lineaireUsed*2*option_ecran\net +option_ecran*surface dans total_eur" },
        { k: "option_tirage", v: "80", role: "tirage = max(option_tirage*surface, 250)" },
        { k: "option_peinture", v: "100", role: "Non utilisé dans computePitchQuote actuel" },
        { k: "option_coffrage", v: "75", role: "Non utilisé dans computePitchQuote actuel" },
        { k: "option_raccordement", v: "75", role: "Non utilisé dans computePitchQuote actuel" },
        { k: "option_livraison", v: "150", role: "livraison = max(option_livraison*surface, 300)" },
        { k: "prix_container", v: "150", role: "Non utilisé directement (remplacé par option_ecran)" },
        { k: "prix_instal", v: "500", role: "install = max(prix_instal*surface, 750)" },
      ],
    };

    const t2 = {
      title: "Mètre linéaire par défaut selon catégorie",
      columns: [
        { key: "rule", label: "Règle" },
        { key: "formula", label: "Formule exacte" },
        { key: "where", label: "Où" },
      ],
      rows: [
        {
          rule: "Catégorie spéciale",
          formula: 'SPECIAL_GROUP = "Exterieur haute luminosité"\nmetreLineaire = (categorieName === SPECIAL_GROUP) ? "5" : "2.5"',
          where: "createDefaultPitchInstance() → agentHome.helpers.js",
        },
        {
          rule: "Lors du calcul",
          formula: "lineaireUsed = max(minLineaire, toNum(lineaireRaw, 0))\navec minLineaire = SPECIAL_GROUP ? 5 : 2.5",
          where: "computePitchQuote() → agentHome.helpers.js",
        },
      ],
    };

    const t3 = {
      title: "Lignes INST, PORT, PARA (agents.js → buildLinesAndTotals)",
      columns: [
        { key: "code", label: "Code" },
        { key: "formula", label: "Montant HT" },
        { key: "qty", label: "Quantité" },
      ],
      rows: [
        {
          code: "PORT",
          formula: "portOffert → 'OFFERT'\nsinon → portQty * 300",
          qty: "qtyTotalProducts (pitch + autres)",
        },
        {
          code: "INST (Murs leds)",
          formula: "instOffert → 'OFFERT'\nsinon → qtyPitchTotal * 600",
          qty: "qtyPitchTotal",
        },
        {
          code: "INST (Totems…)",
          formula: "instOffert → 'OFFERT'\nsinon → qtyOtherTotal * 300",
          qty: "qtyOtherTotal",
        },
        {
          code: "PARA",
          formula: "paraOffert → 'OFFERT'\nsinon → paraQty * 250",
          qty: "qtyTotalProducts",
        },
        {
          code: "ABOBR",
          formula: "isAchatGlobal → non affiché\nsinon → 19.95 (qty=1)",
          qty: "1",
        },
      ],
    };

    return [t1, t2, t3];
  }, []);

  return (
    <div className="dash-page">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, color: "#111827" }}>Formules</h2>
          <p style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Documentation complète des calculs utilisés dans l'application.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </TabBtn>
          ))}
        </div>
      </div>

      {/* ── TAB 1 : Pitch ── */}
      {tab === "pitch" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="1) Formules Murs leds (Pitch)"
              right={<Badge>agentHome.helpers.js → computePitchQuote()</Badge>}
            />
            <Small>
              Calcule surface, diagonale/pouces, pixels, container, coûts, leasing/marge.
              Retourne <b>quote.total</b> (String arrondi) + <b>quote.montant</b> (String xx.xx avec quantité).
              La finition est ajoutée APRÈS dans AgentHome.jsx (voir onglet 2).
            </Small>
          </Card>

          {pitchTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 2 : Finition ── */}
      {tab === "finition" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="2) Calcul finition progressive"
              right={<Badge>AgentHome.jsx → updatePitchInstance()</Badge>}
            />
            <Small>
              La finition est calculée APRÈS computePitchQuote(), sur la base de la surface retournée.
              Le prix est progressif : premier m² au plein prix, chaque m² supplémentaire à 50% du prix/m².
            </Small>
          </Card>

          <Card>
            <SectionTitle title={finitionTable.title} />
            <Table columns={finitionTable.columns} rows={finitionTable.rows} />
            <AlertBox>
              ⚠️ <b>Exemple :</b> surface = 2 m², prixM2 = 42 €/mois<br />
              finitionTotal = 42 + max(0, 2-1) * (42 * 0.5) = 42 + 21 = <b>63 €/mois</b><br />
              prixTotalHtMois = quote.total + 63<br />
              montantHt (2 écrans) = quote.montant + 63 * 2
            </AlertBox>
          </Card>

          <Card>
            <SectionTitle title="Finition dans les options (handleValider)" right={<Badge>AgentHome.jsx</Badge>} />
            <Table
              columns={[
                { key: "step", label: "Étape" },
                { key: "formula", label: "Formule exacte" },
              ]}
              rows={[
                {
                  step: "finitionMonthly (pré-calcul options)",
                  formula: "surface = Number(pi.surfaceM2 || 0)\nprixM2Fin = Number(pi.finitionPriceMonthlyHt || 0)\nsi surface > 0 && prixM2Fin > 0 :\n  finitionMonthly = prixM2Fin\n    + max(0, surface-1) * (prixM2Fin * 0.5)\nsinon : finitionMonthly = 0",
                },
                {
                  step: "Prix option durée",
                  formula: "floor(computePitchQuote({dureeMonths: opt, ...}).total + finitionMonthly)",
                },
                {
                  step: "Prix option achat",
                  formula: "floor(computePitchQuote({typeFinancement: 'achat', ...}).total + finitionMonthly)",
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ── TAB 3 : Options ── */}
      {tab === "options" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="3) Options de financement"
              right={<Badge>handleValider + agents.js</Badge>}
            />
            <Small>
              Les prix des options sont pré-calculés côté front dans <b>handleValider()</b> et envoyés
              au backend dans <b>optionsFinancementPrices</b>. Le backend les utilise directement pour
              l'affichage PDF (avec fallback si absent).
            </Small>
          </Card>

          {optionsTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 4 : Autres produits ── */}
      {tab === "other" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="4) Formules Autres produits"
              right={<Badge>AgentOtherProductsBlock.jsx</Badge>}
            />
            <Small>
              Mensualité de base = prix écran + prix mémoire.
              En achat : (mensualité × durée sélectionnée) × 0.6.
              Pas de finition progressive pour les autres produits.
            </Small>
          </Card>

          {otherTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 5 : Récap ── */}
      {tab === "recap" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="5) Récap total — front + PDF"
              right={<Badge>AgentHome.jsx + agents.js</Badge>}
            />
            <Small>
              Le récap front (affiché dans la page) et le PDF (généré côté backend)
              utilisent la même logique, mais le front recalcule depuis les données brutes
              tandis que le backend utilise les montants reçus du front (pitch) ou recalcule (autres).
            </Small>
          </Card>

          {recapTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 6 : Defaults ── */}
      {tab === "defaults" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="6) Defaults & helpers"
              right={<Badge>DEFAULT_STATIC / agentHome.helpers.js</Badge>}
            />
            <Small>
              Ces valeurs sont utilisées si <b>/api/static-values</b> ne charge pas (erreur réseau ou avant chargement).
              Elles sont aussi les valeurs initiales avant que le serveur réponde.
            </Small>
          </Card>

          {defaultsTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      )}

      <div style={{ height: 12 }} />
    </div>
  );
}
