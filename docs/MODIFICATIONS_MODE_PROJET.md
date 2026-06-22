# MODIFICATIONS MODE PROJET - Persistance serveur + toggle admin

---

## Section 1 - EXPLICATION SIMPLE

### Ce que fait le toggle dans PitchManager

Dans l'interface admin (`/adminmedia4/pitchs/...`), a cote du titre "Pitch Manager",
il y a maintenant une case a cocher "Mode projet" avec un indicateur vert "Active"
ou gris "Desactive".

Quand l'admin coche ou decoche cette case :
- La valeur est sauvegardee instantanement sur le serveur
- Un feedback visuel s'affiche ("Sauvegarde..." pendant l'envoi, "Active" / "Desactive" une fois fait)
- En cas d'erreur reseau, la case revient a son etat precedent et un message d'erreur s'affiche

### Comment ca se propage vers AgentHome

Quand un agent (ou admin) ouvre la page de devis (`/agent/home`) :
- La page charge les valeurs du serveur (comme elle le faisait deja pour les coefficients)
- Elle lit le champ `modeProjet` du serveur et initialise la case "Mode projet" en consequence
- Si l'admin a active le mode projet dans PitchManager, l'agent voit les champs
  Largeur/Hauteur en saisie libre (pas de fleches par multiples du cabinet)
- Si l'admin a desactive le mode projet, les champs sont bloques et les fleches
  par multiples du cabinet sont actives (comportement normal)
- Un admin connecte via `/adminmedia4/` peut toujours cocher/decocher la case localement
  dans AgentHome pour son propre usage, mais la valeur de depart vient du serveur

### Ce qui reste identique

- Toutes les modifications precedentes (fleches cabinet, mm, metre, filtre Tous,
  titres gras, tailles en haut, detection admin par token)
- La logique de calcul (computePitchQuote, buildLinesAndTotals)
- Le PDF
- Le formulaire client
- Le champ modeProjet est un simple boolean dans la base, il ne touche a aucun calcul

---

## Section 2 - FICHIERS MODIFIES

### Fichier 1 : `server/models/StaticValues.js`

**AVANT** (fin du schema, ligne 20) :
```js
    abattement_comptant: { type: Number, default: 0.7 },
  },
  { timestamps: true }
```

**APRES** :
```js
    abattement_comptant: { type: Number, default: 0.7 },
    modeProjet: { type: Boolean, default: false },
  },
  { timestamps: true }
```

1 ligne ajoutee. Tous les autres champs intacts.

---

### Fichier 2 : `server/routes/staticValues.js`

**AVANT** (apres la boucle `for (const k of allowed)`, ligne 60) :
```js
    }

    const updated = await StaticValues.findByIdAndUpdate(doc._id, update, { new: true });
```

**APRES** :
```js
    }

    if (typeof req.body.modeProjet !== "undefined") {
      update.modeProjet = !!req.body.modeProjet;
    }

    const updated = await StaticValues.findByIdAndUpdate(doc._id, update, { new: true });
```

4 lignes ajoutees. Traitement separe du boolean (la whitelist existante ne gere que des Number).
La liste `allowed` existante et toute la logique Number sont intactes.

---

### Fichier 3 : `client/src/pages/PitchManager.jsx`

#### Ajout A : Nouveaux states (apres ligne 22)
```js
const [modeProjet, setModeProjet] = useState(false);
const [modeProjetSaving, setModeProjetSaving] = useState(false);
const [modeProjetError, setModeProjetError] = useState("");
```

#### Ajout B : Fonctions load + toggle (avant le useEffect principal)
```js
const getAuthToken = () =>
  localStorage.getItem("admin_token_v1") ||
  localStorage.getItem("agent_token_v1") || "";

const loadModeProjet = async () => {
  const res = await fetch(`${API}/api/static-values`);
  const data = await res.json();
  setModeProjet(!!data.modeProjet);
};

const toggleModeProjet = async (checked) => {
  setModeProjet(checked);            // optimistic update
  setModeProjetSaving(true);
  const res = await fetch(`${API}/api/static-values`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: ... },
    body: JSON.stringify({ modeProjet: checked }),
  });
  if (!res.ok) setModeProjet(!checked); // rollback on error
};
```

#### Ajout C : Appel au chargement
```js
useEffect(() => {
  loadProducts();
  loadCategories();
  loadPitches();
  loadModeProjet();    // ← ajouté
}, []);
```

#### Ajout D : UI toggle a cote du titre

**AVANT** :
```jsx
<div className="page-header">
  <h2 className="page-title">Pitch Manager</h2>
</div>
```

**APRES** :
```jsx
<div className="page-header">
  <h2 className="page-title">Pitch Manager</h2>

  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <label>
      <input type="checkbox" checked={modeProjet}
        onChange={(e) => toggleModeProjet(e.target.checked)} />
      Mode projet
    </label>
    <span style={{ color: modeProjet ? "#0f7a3a" : "#999" }}>
      {modeProjetSaving ? "Sauvegarde..." : modeProjet ? "Active" : "Desactive"}
    </span>
    {modeProjetError && <span style={{ color: "#b10000" }}>{modeProjetError}</span>}
  </div>
</div>
```

#### Ce qui n'a PAS ete touche dans PitchManager.jsx
- Formulaire ajout pitch, formulaire edition pitch
- Tableau des pitches par categorie
- Boutons reorder, toggle actif, supprimer
- Toute la logique existante

---

### Fichier 4 : `client/src/pages/agent/AgentHome.jsx`

#### Modification : lecture modeProjet depuis le serveur

**AVANT** (useEffect static-values, ligne 399) :
```js
const data = await res.json();
setStaticVals(normalizeStaticVals(data || {}));
```

**APRES** :
```js
const data = await res.json();
setStaticVals(normalizeStaticVals(data || {}));
setModeProjet(!!data.modeProjet);
```

1 ligne ajoutee. Le state `modeProjet` existait deja (ajout precedent).
Toutes les modifications precedentes (hasAdminToken, fleches, mm, etc.) sont intactes.

#### Ce qui n'a PAS ete touche dans AgentHome.jsx
- Case "Mode projet" dans la section Dimensions (toujours visible uniquement si hasAdminToken)
- Fleches par multiples du cabinet
- Labels "metre", labels "mm"
- Filtre "Tous"
- Titres categories en gras
- Logique de calcul
- Formulaire client, finition, fixation, financement
- Recap totaux, validation devis, PDF

---

## Section 3 - GUIDE DE TEST

### Test 1 : Toggle dans PitchManager

**Ou aller** : `/adminmedia4/pitchs/ajoutpitch` (connecte en admin)

**Quoi faire** :
1. Verifier que la case "Mode projet" est visible a droite du titre "Pitch Manager"
2. Verifier que l'indicateur affiche "Desactive" (gris) par defaut

**Ce qu'on doit voir si c'est bon** :
- Case decochee, texte "Desactive" en gris
- Aucune erreur dans la console

**Ce qu'on doit voir si c'est casse** :
- Case absente ou erreur au chargement

---

### Test 2 : Activer le mode projet depuis PitchManager

**Quoi faire** :
1. Cocher la case "Mode projet" dans PitchManager
2. Observer le texte a droite

**Ce qu'on doit voir si c'est bon** :
- Pendant 1-2 secondes : "Sauvegarde..."
- Puis : "Active" en vert
- La case reste cochee

**Ce qu'on doit voir si c'est casse** :
- La case se decoche toute seule (rollback = erreur serveur)
- Message d'erreur rouge "Erreur sauvegarde mode projet."

---

### Test 3 : Verification persistance (recharger la page)

**Quoi faire** :
1. Activer le mode projet (case cochee, indicateur vert)
2. Recharger la page (F5)

**Ce qu'on doit voir si c'est bon** :
- La case est toujours cochee apres rechargement
- "Active" en vert

**Ce qu'on doit voir si c'est casse** :
- La case revient decochee (la valeur n'a pas ete sauvegardee)

---

### Test 4 : Propagation vers AgentHome

**Quoi faire** :
1. Dans PitchManager : activer le mode projet
2. Ouvrir un nouvel onglet sur `/agent/home` (connecte en agent)
3. Cocher "Murs leds", selectionner un pitch avec dimensions (ex: "640*640")
4. Regarder la section "Dimensions"

**Ce qu'on doit voir si c'est bon** :
- Les champs Largeur et Hauteur sont en saisie libre (fond blanc, pas gris)
- Pas de fleches haut/bas
- L'agent peut taper n'importe quelle valeur

**Ce qu'on doit voir si c'est casse** :
- Les champs sont bloques avec fleches (le mode projet n'a pas ete lu du serveur)

---

### Test 5 : Desactiver depuis PitchManager, verifier cote agent

**Quoi faire** :
1. Dans PitchManager : decocher la case "Mode projet"
2. Recharger `/agent/home`
3. Selectionner un pitch avec dimensions

**Ce qu'on doit voir si c'est bon** :
- Les champs Largeur et Hauteur sont gris (readonly)
- Les fleches haut/bas par multiples du cabinet sont presentes
- L'agent ne peut plus taper librement

---

### Test 6 : Admin dans AgentHome peut toujours toggle localement

**Quoi faire** :
1. Dans PitchManager : desactiver le mode projet (case decochee)
2. Ouvrir `/agent/home` dans le meme navigateur (admin connecte = token admin present)
3. Selectionner un pitch

**Ce qu'on doit voir si c'est bon** :
- La case "Mode projet" est visible a cote de "Dimensions :" (car hasAdminToken = true)
- Elle est decochee (valeur serveur)
- L'admin peut la cocher localement pour son propre usage
- Cocher la rend les champs en saisie libre pour cette session uniquement

---

### Test 7 : Agent normal ne voit pas la case dans AgentHome

**Quoi faire** :
1. Se deconnecter de `/adminmedia4/`
2. Se connecter sur `/agent/login` en tant qu'agent simple
3. Selectionner un pitch

**Ce qu'on doit voir si c'est bon** :
- Pas de case "Mode projet" dans la section Dimensions
- Le comportement depend uniquement de la valeur serveur
  (si mode projet actif sur le serveur → saisie libre ; sinon → fleches)
