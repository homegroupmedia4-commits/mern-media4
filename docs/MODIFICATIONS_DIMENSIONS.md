# MODIFICATIONS DIMENSIONS - Fleches cabinet, mode projet, affichage "mm"

---

## Section 1 - EXPLICATION EN LANGAGE SIMPLE

### Ce qui change pour l'agent normal (sans mode projet)

**Avant** : l'agent pouvait taper n'importe quelle valeur dans les champs Largeur et Hauteur (par exemple 1.37m, 2.55m, etc.). Rien ne l'empechait de saisir une dimension qui ne correspond pas a un multiple du cabinet LED.

**Maintenant** :
- Les champs Largeur et Hauteur sont **bloques en saisie libre** (gris clair, non modifiables au clavier)
- Des **fleches haut/bas** apparaissent a droite de chaque champ
- Chaque clic sur une fleche ajoute ou retire exactement **un cabinet** en dimensions
- Exemple : un pitch "640*640mm" -> chaque clic sur la fleche haut du champ Largeur ajoute 0.640m. Clic sur la fleche bas retire 0.640m
- Exemple : un pitch "500*1000mm" -> la fleche Largeur avance de 0.500m, la fleche Hauteur avance de 1.000m
- La valeur **ne peut jamais descendre en dessous d'un cabinet** (minimum = 1 cabinet)
- Sous chaque champ, une indication grise montre le pas utilise (ex: "pas : 0.64m (640mm)")
- Dans la liste des pitches a cocher, les dimensions s'affichent maintenant avec "mm" : "640*640**mm**" au lieu de "640*640"
- Les labels des champs disent "Largeur (metre)" et "Hauteur (metre)" au lieu de "Largeur (m)" et "Hauteur (m)"

**Si le pitch n'a pas de dimensions lisibles** (champ vide ou format inconnu), les champs restent en saisie libre comme avant.

### Ce qui change pour l'admin/responsable avec mode projet

- Une **case a cocher "Mode projet"** apparait a cote du titre "Dimensions :" (visible uniquement pour les roles admin, superadmin ou responsable)
- Quand cette case est cochee :
  - Les fleches disparaissent
  - Les champs redeviennent en saisie libre (comme avant la modification)
  - L'admin peut taper n'importe quelle valeur
- Quand la case est decochee : comportement par multiples (meme chose que l'agent normal)
- Par defaut la case est decochee

### Ce qui reste identique

- Toute la logique de calcul (computePitchQuote, buildLinesAndTotals) : aucun changement
- La generation du PDF : aucun changement
- Les champs Diagonale, Pouces, Pixels, Surface : toujours en lecture seule, toujours calcules automatiquement
- Le backend (server/) : aucun fichier touche
- L'admin panel (PitchManager, CategoriesPitch, etc.) : aucun changement
- La page "Mes devis" : aucun changement
- Les donnees enregistrees dans le devis : aucun changement (largeurM et hauteurM restent des nombres en metres)

---

## Section 2 - FICHIERS MODIFIES

### Fichier 1 : `client/src/pages/agent/agentHome.helpers.js`

**Ajout** (lignes 8-16, entre SPECIAL_GROUP et toNum) :

```js
// AVANT : la fonction toNum commencait directement apres SPECIAL_GROUP
// APRES : nouvelle fonction inseree

export function parseCabinetDimensions(dimensionsStr) {
  const raw = String(dimensionsStr || "").trim();
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return null;
  return { widthMm: w, heightMm: h, widthM: w / 1000, heightM: h / 1000 };
}
```

**Role** : parse "640*640" en `{ widthMm: 640, heightMm: 640, widthM: 0.64, heightM: 0.64 }`. Retourne null si format non reconnu.

### Fichier 2 : `client/src/pages/agent/AgentHome.jsx`

#### Modification A : Import (ligne 27)

**AVANT** :
```js
  applyApport,
} from "./agentHome.helpers";
```

**APRES** :
```js
  applyApport,
  parseCabinetDimensions,
} from "./agentHome.helpers";
```

#### Modification B : Nouveaux states (lignes 108-112, apres selectedPitchIds)

**AVANT** :
```js
const [selectedPitchIds, setSelectedPitchIds] = useState([]);

// --- refs
```

**APRES** :
```js
const [selectedPitchIds, setSelectedPitchIds] = useState([]);

const [modeProjet, setModeProjet] = useState(false);
const isAdminOrResponsable = useMemo(() => {
  const r = String(agent?.role || "").toLowerCase();
  return ["admin", "superadmin", "responsable"].includes(r);
}, [agent]);

// --- refs
```

#### Modification C : Section Dimensions (lignes 1545-1629, dans le rendu de chaque pitchInstance)

**AVANT** :
```jsx
<div className="agenthome-subsectionTitle">Dimensions :</div>
<div className="agenthome-grid2">
  <div className="agenthome-field">
    <label>Largeur (m) :</label>
    <input value={pi.largeurM} onChange={...} className="agenthome-input" />
  </div>
  <div className="agenthome-field">
    <label>Hauteur (m) :</label>
    <input value={pi.hauteurM} onChange={...} className="agenthome-input" />
  </div>
```

**APRES** :
```jsx
<div className="agenthome-subsectionTitle" style={{ display: "flex", ... }}>
  <span>Dimensions :</span>
  {isAdminOrResponsable && (
    <label ...>
      <input type="checkbox" checked={modeProjet} onChange={...} />
      Mode projet
    </label>
  )}
</div>
<div className="agenthome-grid2">
  {(() => {
    const cab = parseCabinetDimensions(pi.dimensions);
    const canStep = !!cab && !modeProjet;
    // ... fleches + readonly quand canStep ...
    return (<> ... </>);
  })()}
```

Changements cles :
- Labels "Largeur (m)" -> "Largeur (metre)" et "Hauteur (m)" -> "Hauteur (metre)"
- Input readonly quand canStep est true
- Boutons fleche haut/bas avec pas = dimensions du cabinet
- Indication "pas : X.XXm (XXXmm)" sous chaque champ
- Case "Mode projet" visible uniquement pour admin/responsable

#### Modification D : Affichage "mm" dans les checkboxes de pitch (2 endroits)

**AVANT** (mode toutes categories + mode filtre) :
```js
const meta = [pitch?.dimensions, pitch?.luminosite, pitch?.codeProduit]
```

**APRES** :
```js
const dims = pitch?.dimensions ? pitch.dimensions + "mm" : "";
const meta = [dims, pitch?.luminosite, pitch?.codeProduit]
```

#### Modification E : Affichage "mm" dans le header du pitch selectionne

**AVANT** :
```js
const meta = [pi.dimensions, pi.luminosite, pi.codeProduit].filter(Boolean).join(", ");
```

**APRES** :
```js
const dims = pi.dimensions ? pi.dimensions + "mm" : "";
const meta = [dims, pi.luminosite, pi.codeProduit].filter(Boolean).join(", ");
```

#### Modification F : Label dans le texte recapitulatif du devis

**AVANT** :
```js
`Largeur (m) : ${pi.largeurM || "—"} – Hauteur (m) : ${pi.hauteurM || "—"}`
```

**APRES** :
```js
`Largeur (metre) : ${pi.largeurM || "—"} – Hauteur (metre) : ${pi.hauteurM || "—"}`
```

### Ce qui n'a PAS ete touche

| Element | Statut |
|---------|--------|
| `computePitchQuote()` | INTACT |
| `buildLinesAndTotals()` (backend) | INTACT |
| `createDefaultPitchInstance()` | INTACT |
| `applyApport()` | INTACT |
| `normalizeStaticVals()` | INTACT |
| Tout le backend `server/` | NON TOUCHE |
| `AgentOtherProductsBlock.jsx` | NON TOUCHE |
| `AgentMesDevis.jsx` | NON TOUCHE |
| `AdminNosDevis.jsx` | NON TOUCHE |
| `PitchManager.jsx` | NON TOUCHE |
| `App.css` / `AgentHome.css` | NON TOUCHE |
| Formulaire client (societe, adresse, etc.) | INTACT |
| Finition, fixation, financement | INTACT |
| Recap totaux et validation devis | INTACT |

---

## Section 3 - GUIDE DE TEST

### Test 1 : Fleches par multiples du cabinet

**Ou aller** : `http://localhost:5173/agent/home` (connecte en tant qu'agent)

**Quoi faire** :
1. Cocher "Murs leds" dans la liste des produits
2. Cocher un pitch avec dimensions connues (ex: P2.6 avec "640*640")
3. Regarder la section "Dimensions" du pitch selectionne

**Ce qu'on doit voir si c'est bon** :
- Les champs "Largeur (metre)" et "Hauteur (metre)" sont gris (readonly)
- Des boutons fleche haut/bas apparaissent a droite de chaque champ
- Sous chaque champ : "pas : 0.64m (640mm)"
- Cliquer sur la fleche haut de Largeur : le champ passe de "" a "0.64", puis "1.28", "1.92", etc.
- Cliquer sur la fleche bas : descend de 0.64m a chaque clic
- Le minimum est 0.64 (1 cabinet) — la fleche bas ne descend pas plus bas
- Les champs Diagonale, Pouces, Pixels et Surface se mettent a jour automatiquement

**Ce qu'on doit voir si c'est casse** :
- Les champs sont vides et ne changent pas au clic
- Pas de fleches visibles
- Erreur dans la console

### Test 2 : Pitch avec dimensions non-carrees

**Quoi faire** :
1. Selectionner un pitch avec dimensions "500*1000" (si disponible dans la base)

**Ce qu'on doit voir si c'est bon** :
- Fleche Largeur : pas de 0.5m (affiche "pas : 0.5m (500mm)")
- Fleche Hauteur : pas de 1m (affiche "pas : 1m (1000mm)")
- Les deux fonctionnent independamment

### Test 3 : Pitch sans dimensions lisibles

**Quoi faire** :
1. Si un pitch a un champ dimensions vide ou dans un format non standard (ex: "N/A")

**Ce qu'on doit voir si c'est bon** :
- Pas de fleches visibles
- Les champs sont en saisie libre (non gris, on peut taper)
- Comportement identique a l'ancien

### Test 4 : Mode projet (admin/responsable uniquement)

**Ou aller** : Se connecter avec un compte ayant le role "responsable" ou etre admin

**Quoi faire** :
1. Aller sur `/agent/home`
2. Selectionner un pitch
3. Regarder a cote du titre "Dimensions :"

**Ce qu'on doit voir si c'est bon** :
- Une case a cocher "Mode projet" apparait a droite de "Dimensions :"
- Par defaut decochee (fleches visibles, champs readonly)
- Cocher la case : les fleches disparaissent, les champs deviennent editables (fond blanc)
- Decocher : les fleches reviennent, les champs redeviennent readonly

**Ce qu'on doit voir si c'est casse** :
- La case n'apparait pas du tout (meme pour un admin)
- Cocher la case ne change rien

### Test 5 : Mode projet invisible pour agent normal

**Quoi faire** :
1. Se connecter avec un compte ayant le role "agent"

**Ce qu'on doit voir si c'est bon** :
- Aucune case "Mode projet" n'apparait
- Les fleches sont toujours visibles (si dimensions lisibles)

### Test 6 : Affichage "mm" dans la liste des pitches

**Ou aller** : `/agent/home`, section "Murs leds"

**Quoi faire** :
1. Regarder les checkboxes de la liste des pitches

**Ce qu'on doit voir si c'est bon** :
- Chaque pitch affiche ses dimensions avec "mm" : ex: "P2.6 (640*640mm, 4500cd/m2, OSR2601)"
- Avant c'etait "P2.6 (640*640, 4500cd/m2, OSR2601)" sans "mm"

### Test 7 : Affichage "mm" dans le header du pitch selectionne

**Quoi faire** :
1. Cocher un pitch
2. Regarder le titre en gras de la carte du pitch

**Ce qu'on doit voir si c'est bon** :
- "P2.6 (640*640mm, 4500cd/m2, OSR2601)" avec "mm"

### Test 8 : Labels "metre" au lieu de "(m)"

**Quoi faire** :
1. Cocher un pitch
2. Regarder les labels des champs dimensions

**Ce qu'on doit voir si c'est bon** :
- "Largeur (metre) :" au lieu de "Largeur (m) :"
- "Hauteur (metre) :" au lieu de "Hauteur (m) :"

### Test 9 : Verification que les calculs ne sont pas casses

**Quoi faire** :
1. Selectionner un pitch
2. Utiliser les fleches pour definir Largeur = 1.28m et Hauteur = 1.92m (ex: 2x3 cabinets de 640mm)
3. Verifier que Surface = 2.46 m2 (1.28 * 1.92)
4. Verifier que les Pixels sont calcules
5. Valider le devis et generer le PDF

**Ce qu'on doit voir si c'est bon** :
- Les totaux sont coherents
- Le PDF se genere correctement
- Les montants correspondent a l'affichage
