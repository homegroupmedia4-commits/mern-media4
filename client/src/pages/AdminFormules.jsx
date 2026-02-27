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

const Badge = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      background: "#f3f4f6",
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
                  }}
                >
                  {typeof r?.[c.key] === "string" || typeof r?.[c.key] === "number"
                    ? r[c.key]
                    : r?.[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: 12, fontSize: 13, color: "#6b7280" }}
              >
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
  const [tab, setTab] = useState("pitch"); // pitch | other | recap | defaults

  const tabs = useMemo(
    () => [
      { key: "pitch", label: "1) Murs leds (Pitch)" },
      { key: "other", label: "2) Autres produits" },
      { key: "recap", label: "3) Récap total" },
      { key: "defaults", label: "4) Defaults & helpers" },
    ],
    []
  );

  const pitchTables = useMemo(() => {
    const t1 = {
      title: "A) Entrées + normalisation",
      columns: [
        { key: "input", label: "Entrée" },
        { key: "formula", label: "Formule" },
        { key: "output", label: "Sortie" },
        { key: "where", label: "Où" },
      ],
      rows: [
        {
          input: "largeurM",
          formula: "L = toNum(largeurM) = Number(String(v).replace(',', '.'))",
          output: "L (Number)",
          where: "agentHome.helpers.js → computePitchQuote()",
        },
        {
          input: "hauteurM",
          formula: "H = toNum(hauteurM)",
          output: "H (Number)",
          where: "agentHome.helpers.js → computePitchQuote()",
        },
        {
          input: "L, H",
          formula: "surface = L * H",
          output: "surface (m²)",
          where: "agentHome.helpers.js → computePitchQuote()",
        },
      ],
    };

    const t2 = {
      title: "B) Diagonale + pouces (arrondi CF7)",
      columns: [
        { key: "step", label: "Étape" },
        { key: "formula", label: "Formule" },
        { key: "output", label: "Champ UI" },
      ],
      rows: [
        {
          step: "Diagonale brute",
          formula: "diagonaleCm_raw = sqrt(L² + H²) * 100",
          output: "—",
        },
        {
          step: "Pouces bruts",
          formula: "pouces_raw = diagonaleCm_raw / 2.54",
          output: "—",
        },
        {
          step: "Arrondi CF7",
          formula: "roundDimLikeCF7(n) = (frac(n) >= 0.51) ? ceil(n) : floor(n)",
          output: "—",
        },
        {
          step: "Diagonale affichée",
          formula: "diagonaleCm = roundDimLikeCF7(diagonaleCm_raw)",
          output: "pi.diagonaleCm",
        },
        {
          step: "Pouces affichés",
          formula: "pouces = roundDimLikeCF7(pouces_raw)",
          output: "pi.pouces",
        },
      ],
    };

    const t3 = {
      title: "C) Pitch mm + Pixels",
      columns: [
        { key: "step", label: "Étape" },
        { key: "formula", label: "Formule" },
        { key: "note", label: "Note / UI" },
      ],
      rows: [
        {
          step: "Extraction pitch",
          formula: "pitchMm = parsePitchMmFromLabel(pitchLabel) avec /P\\s*([0-9]*\\.?[0-9]+)/i",
          note: 'Ex: "P3.91" => 3.91',
        },
        {
          step: "Condition dimensions",
          formula: "hasDims = (L > 0 && H > 0)",
          note: "Sans dimensions => px = ''",
        },
        {
          step: "Largeur px",
          formula: "largeurPx = !hasDims ? '' : (pitchMm > 0 ? floor((L*1000)/pitchMm) : '—')",
          note: "UI: pi.largeurPx",
        },
        {
          step: "Hauteur px",
          formula: "hauteurPx = !hasDims ? '' : (pitchMm > 0 ? floor((H*1000)/pitchMm) : '—')",
          note: "UI: pi.hauteurPx",
        },
      ],
    };

    const t4 = {
      title: "D) Linéaire minimum + container",
      columns: [
        { key: "item", label: "Élément" },
        { key: "formula", label: "Formule" },
        { key: "default", label: "Par défaut" },
      ],
      rows: [
        {
          item: "SPECIAL_GROUP",
          formula: `SPECIAL_GROUP = "Exterieur haute luminosité"`,
          default: "—",
        },
        {
          item: "minLineaire",
          formula: "minLineaire = (categorieName === SPECIAL_GROUP) ? 5 : 2.5",
          default: "5 ou 2.5",
        },
        {
          item: "lineaireUsed",
          formula: "lineaireUsed = max(minLineaire, toNum(lineaireRaw, 0))",
          default: "minLineaire",
        },
        {
          item: "container",
          formula: "container = lineaireUsed * 2 * option_ecran",
          default: "option_ecran=100 => lineaireUsed*200",
        },
      ],
    };

    const t5 = {
      title: "E) Coûts + Leasing + Résultat",
      columns: [
        { key: "bloc", label: "Bloc" },
        { key: "formula", label: "Formules" },
        { key: "sortie", label: "Sortie" },
      ],
      rows: [
        {
          bloc: "Frais (min)",
          formula:
            "tirage = max(option_tirage*surface,250)\n" +
            "livraison = max(option_livraison*surface,300)\n" +
            "install = max(prix_instal*surface,750)",
          sortie: "tirage/livraison/install",
        },
        {
          bloc: "Brut",
          formula:
            "total_accessoires = accessoires_players + cout_locaux\n" +
            "total_pieces = surface*0.1*prixPitch*droits_de_douanes\n" +
            "total_ecran = (prixPitch + container)*surface\n" +
            "total_brut = total_ecran + total_accessoires + total_pieces",
          sortie: "total_brut",
        },
        {
          bloc: "EUR",
          formula:
            "total_eur = (total_brut/euros_dollars) + install + (option_ecran*surface) + livraison + tirage",
          sortie: "total_eur",
        },
        {
          bloc: "Leasing + marge",
          formula: "step1 = total_eur / cout_leasing\nstep2 = step1 / marge_catalogue",
          sortie: "step2",
        },
        {
          bloc: "Mensuel / Achat",
          formula:
            "duree = max(1,int(dureeMonths))\n" +
            "prix_mensuel = step2 / duree\n" +
            "prix_achat = step2 * 0.6\n" +
            "prix_total_affiche = (typeFinancement==='achat') ? prix_achat : prix_mensuel\n" +
            "totalArrondi = round(prix_total_affiche)\n" +
            "q = max(1,int(quantite))\n" +
            "montantHt = q * totalArrondi",
          sortie: "quote.total / quote.montant",
        },
      ],
    };

    return [t1, t2, t3, t4, t5];
  }, []);

  const otherTables = useMemo(() => {
    const t1 = {
      title: "computeOtherLine() — prix unitaire + total",
      columns: [
        { key: "step", label: "Étape" },
        { key: "formula", label: "Formule" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          step: "Mémoire",
          formula: "memPrice = memOptions.find(m => m._id === memId)?.price ?? 0",
          note: "0 si introuvable",
        },
        {
          step: "Mensualité base",
          formula: "monthly = Number(basePrice) + Number(memPrice)",
          note: "Mensuel (location)",
        },
        {
          step: "Mois",
          formula: "months = max(1, int(leasingMonths))",
          note: "Sélecteur durée",
        },
        {
          step: "Prix unitaire",
          formula: "unit = (typeFinancement==='achat') ? (monthly*months)*0.6 : monthly",
          note: "Achat = total durée *0.6",
        },
        {
          step: "Quantité",
          formula: "q = max(1, int(qty))",
          note: "Input qty",
        },
        {
          step: "Total",
          formula: "total = unit * q",
          note: "Montant HT ligne",
        },
      ],
    };

    const t2 = {
      title: "Structure de sélection (par produit + par durée)",
      columns: [
        { key: "key", label: "Clé" },
        { key: "shape", label: "Structure" },
        { key: "utilite", label: "Utilité" },
      ],
      rows: [
        {
          key: "otherSelections[productId]",
          shape: "{ leasingMonths, typeFinancement, byMonths }",
          utilite: "Conserver les checkboxes par durée",
        },
        {
          key: "byMonths[months].checked[rowId]",
          shape: "{ memId, qty }",
          utilite: "Ligne choisie (taille écran + mémoire + qty)",
        },
      ],
    };

    return [t1, t2];
  }, []);

  const recapTables = useMemo(() => {
    const t1 = {
      title: "Addition des montants + TVA + TTC",
      columns: [
        { key: "part", label: "Partie" },
        { key: "formula", label: "Formule" },
        { key: "note", label: "Note" },
      ],
      rows: [
        {
          part: "HT autres produits",
          formula: "ht += unit * qty (recalcul brut depuis otherSelections)",
          note: "Même logique computeOtherLine()",
        },
        {
          part: "HT murs leds",
          formula: "ht += parseEuro(pi.montantHt)",
          note: "montantHt déjà calculé dans AgentHome",
        },
        {
          part: "ABOBR",
          formula: "si au moins 1 ligne => ht += 19.95",
          note: "Charge fixe",
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
      title: "Important (cohérence) — finition",
      columns: [
        { key: "topic", label: "Sujet" },
        { key: "status", label: "Statut" },
        { key: "detail", label: "Détail" },
      ],
      rows: [
        {
          topic: "Finition dans montantHt",
          status: "Incluse",
          detail: "montantHt = quote.montant + finUnit*qScreens",
        },
        {
          topic: "Double comptage finition",
          status: "À surveiller",
          detail:
            "Si tu ajoutes en plus ht += finPrice*q, tu comptes 2 fois (selon ton code actuel).",
        },
      ],
    };

    return [t1, t2];
  }, []);

  const defaultsTables = useMemo(() => {
    const t1 = {
      title: "Default static values (DEFAULT_STATIC)",
      columns: [
        { key: "k", label: "Clé" },
        { key: "v", label: "Valeur" },
        { key: "note", label: "Note" },
      ],
      rows: [
        { k: "accessoires_players", v: "800", note: "Accessoires" },
        { k: "cout_locaux_chine_france", v: "1000", note: "Coûts locaux" },
        { k: "cout_leasing", v: "0.7", note: "Coefficient leasing" },
        { k: "marge_catalogue", v: "0.7", note: "Marge" },
        { k: "droits_de_douanes", v: "1.14", note: "Douanes" },
        { k: "euros_dollars", v: "1.07", note: "Taux conversion" },
        { k: "option_ecran", v: "100", note: "Option €/m² (sert aussi container)" },
        { k: "option_tirage", v: "80", note: "€/m²" },
        { k: "option_livraison", v: "150", note: "€/m²" },
        { k: "prix_instal", v: "500", note: "€/m²" },
      ],
    };

    const t2 = {
      title: "Default mètre linéaire à la création d’une instance",
      columns: [
        { key: "rule", label: "Règle" },
        { key: "formula", label: "Formule" },
        { key: "where", label: "Où" },
      ],
      rows: [
        {
          rule: "Spécial",
          formula: "metreLineaire = (categorieName === SPECIAL_GROUP) ? '5' : '2.5'",
          where: "createDefaultPitchInstance() (agentHome.helpers.js)",
        },
      ],
    };

    return [t1, t2];
  }, []);

  const headerSub = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge>Client-side</Badge>
      <Badge>AgentHome.jsx</Badge>
      <Badge>AgentOtherProductsBlock.jsx</Badge>
      <Badge>agentHome.helpers.js</Badge>
    </div>
  );

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
          <h2 style={{ margin: 0, fontWeight: 900, color: "#111827" }}>
            Formules (calculs côté client)
          </h2>
          <div style={{ marginTop: 6 }}>{headerSub}</div>
          <div style={{ marginTop: 8 }}>
            <Small>
              Objectif : une page Admin “source de vérité” sur les calculs réellement appliqués.
            </Small>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </TabBtn>
          ))}
        </div>
      </div>

      {tab === "pitch" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle
              title="1) Formules “Murs leds” (Pitch) — computePitchQuote()"
              right={<Badge>agentHome.helpers.js</Badge>}
            />
            <Small>
              Résultat : calcule surface, diagonale/pouces, pixels, container, coûts, leasing/marge,
              puis renvoie total (arrondi) + montant (xx.xx).
            </Small>
          </Card>

          {pitchTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}

          <Card>
            <SectionTitle title="Ajout finition (AgentHome.jsx → updatePitchInstance)" right={<Badge>AgentHome.jsx</Badge>} />
            <Table
              columns={[
                { key: "step", label: "Étape" },
                { key: "formula", label: "Formule" },
                { key: "note", label: "Note" },
              ]}
              rows={[
                {
                  step: "Quantité écrans",
                  formula: "qScreens = max(1, int(next.quantite))",
                  note: "Quantité d’écrans",
                },
                {
                  step: "Prix finition",
                  formula: "finUnit = Number(next.finitionPriceMonthlyHt || 0)",
                  note: "Interprété comme €/mois",
                },
                {
                  step: "Prix total affiché",
                  formula: "prixTotalHtMois = Number(quote.total || 0) + finUnit",
                  note: "Affiché dans UI",
                },
                {
                  step: "Montant HT",
                  formula: "montantHt = Number(quote.montant || 0) + finUnit*qScreens",
                  note: "Total mensuel HT avec quantité",
                },
              ]}
            />
            <div style={{ marginTop: 10 }}>
              <Small>
                ⚠️ Dans ton code actuel, la finition est ajoutée même en “achat” (comme si c’était €/mois).
              </Small>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "other" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle title="2) Formules “Autres produits” — computeOtherLine()" right={<Badge>AgentOtherProductsBlock.jsx</Badge>} />
            <Small>
              Mensualité de base = (prix écran + prix mémoire). En achat : (mensualité * mois) * 0.6.
            </Small>
          </Card>

          {otherTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "recap" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle title="3) Récap total — addition + TVA + TTC" right={<Badge>AgentHome.jsx</Badge>} />
            <Small>
              Le récap recalcule les autres produits, additionne les pitchs (montantHt), ajoute ABOBR,
              puis TVA 20% et TTC.
            </Small>
          </Card>

          {recapTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "defaults" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <SectionTitle title="4) Defaults & helpers" right={<Badge>DEFAULT_STATIC / helpers</Badge>} />
            <Small>
              Ces valeurs sont utilisées si /api/static-values ne charge pas (ou avant chargement).
            </Small>
          </Card>

          {defaultsTables.map((t) => (
            <Card key={t.title}>
              <SectionTitle title={t.title} />
              <Table columns={t.columns} rows={t.rows} />
            </Card>
          ))}
        </div>
      ) : null}

      <div style={{ height: 12 }} />
    </div>
  );
}
