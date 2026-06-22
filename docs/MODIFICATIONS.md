# MODIFICATIONS - Bouton "Generer un mot de passe" (AgentRegister.jsx)

## 1. Lignes modifiees (avant / apres)

### Zone 1 : Ajout des states et fonctions (apres ligne 83)

**AVANT :**
```jsx
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);

const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
```

**APRES :**
```jsx
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);

const [showPassword, setShowPassword] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);
const [copied, setCopied] = useState(false);

const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

const generatePassword = () => { ... };
const copyPassword = async () => { ... };
```

### Zone 2 : Champ "Mot de passe" (Row 2, anciennes lignes 214-217)

**AVANT :**
```jsx
<div className="field">
  <label>Mot de passe</label>
  <input value={form.password} onChange={setField("password")} type="password" />
</div>
```

**APRES :**
```jsx
<div className="field">
  <label>Mot de passe</label>
  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
    <div style={{ position: "relative", flex: 1 }}>
      <input ... type={showPassword ? "text" : "password"} />
      <button>toggle voir/cacher</button>
    </div>
    <button>Generer</button>
    {form.password && <button>Copier</button>}
  </div>
</div>
```

### Zone 3 : Champ "Confirmer le Mot de passe" (Row 3, anciennes lignes 222-224)

**AVANT :**
```jsx
<div className="field">
  <label>Confirmer le Mot de passe</label>
  <input value={form.confirmPassword} onChange={setField("confirmPassword")} type="password" />
</div>
```

**APRES :**
```jsx
<div className="field">
  <label>Confirmer le Mot de passe</label>
  <div style={{ position: "relative" }}>
    <input ... type={showConfirm ? "text" : "password"} />
    <button>toggle voir/cacher</button>
  </div>
</div>
```

---

## 2. Fonctions ajoutees

### `generatePassword()`
- Genere un mot de passe de 12 caracteres
- Garantit au moins : 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole
- Melange aleatoire (shuffle Fisher-Yates simplifie)
- Remplit `form.password` ET `form.confirmPassword` simultanement
- Active `showPassword` et `showConfirm` pour montrer le mot de passe genere
- Reset le flag `copied`

### `copyPassword()`
- Copie `form.password` dans le presse-papiers
- Utilise `navigator.clipboard.writeText` (API moderne)
- Fallback `document.execCommand("copy")` pour navigateurs anciens
- Affiche "Copie !" pendant 2 secondes via le state `copied`

### States ajoutes
| State | Type | Role |
|-------|------|------|
| `showPassword` | boolean | Toggle voir/cacher pour le champ mot de passe |
| `showConfirm` | boolean | Toggle voir/cacher pour le champ confirmation |
| `copied` | boolean | Feedback visuel "Copie !" sur le bouton copier |

---

## 3. Ce qui n'a PAS ete modifie

| Element | Status |
|---------|--------|
| Gate password `Medi@91?devis` | INTACT (ligne 11) |
| Constantes `TOKEN_KEY`, `USER_KEY` | INTACT |
| `GATE_SESSION_KEY` | INTACT |
| Logique gate (`submitGate`, `logoutGate`) | INTACT |
| State `form` (structure initiale) | INTACT |
| Fonction `submit` (logique d'inscription) | INTACT |
| Appel API `POST /api/agents/register` | INTACT |
| `loadParrains()` | INTACT |
| Tous les autres champs du formulaire (nom, prenom, email, parrain, societe, siret, adresse, etc.) | INTACT |
| CSS (`AgentRegister.css`) | INTACT |
| `server/routes/agents.js` | NON TOUCHE |
| Tous les autres fichiers du projet | NON TOUCHES |

---

## 4. Comment tester la fonctionnalite

### Pre-requis
1. Lancer le frontend : `cd client && npm run dev`
2. Ouvrir `http://localhost:5173/agent/register`
3. Saisir le mot de passe gate : `Medi@91?devis`

### Tests a effectuer

**Test 1 : Generation de mot de passe**
1. Cliquer sur le bouton "Generer" a cote du champ mot de passe
2. Verifier que les deux champs (password + confirm) sont remplis avec le meme mot de passe
3. Verifier que le mot de passe est visible en clair (les deux champs passent en mode texte)
4. Verifier que le mot de passe fait 12 caracteres et contient majuscules + minuscules + chiffres + symboles

**Test 2 : Toggle voir/cacher**
1. Cliquer sur l'icone oeil du champ mot de passe : doit basculer entre texte et asterisques
2. Cliquer sur l'icone oeil du champ confirmation : meme comportement, independant du premier
3. Les deux toggles sont independants

**Test 3 : Copier dans le presse-papiers**
1. Generer ou saisir un mot de passe
2. Cliquer sur "Copier"
3. Le bouton doit passer a "Copie !" avec fond vert pendant 2 secondes
4. Coller (Ctrl+V) dans un editeur pour verifier que le bon mot de passe a ete copie
5. Le bouton "Copier" n'apparait que si le champ mot de passe n'est pas vide

**Test 4 : Saisie manuelle intacte**
1. Saisir un mot de passe manuellement dans le champ password
2. Saisir la confirmation manuellement
3. Verifier que l'inscription fonctionne normalement (pas de regression)

**Test 5 : Inscription complete**
1. Remplir tous les champs obligatoires
2. Utiliser "Generer" pour le mot de passe
3. Cliquer "S'inscrire"
4. Verifier que l'inscription reussit et redirige vers `/agent/home`

**Test 6 : Responsive**
1. Tester sur mobile (< 680px) : les boutons Generer/Copier doivent rester accessibles
2. Tester sur tablette (820px) : layout correct
