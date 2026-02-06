// client/src/pages/agent/AgentRegister.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AgentRegister.css";

const TOKEN_KEY = "agent_token_v1";
const USER_KEY = "agent_user_v1";

// 🔒 Gate (mot de passe requis pour accéder à la page)
const GATE_SESSION_KEY = "agent_register_gate_ok_v1";
const GATE_PASSWORD = "Medi@91?devis";

export default function AgentRegister() {
  const navigate = useNavigate();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  // -----------------------------
  // 🔒 Gate state
  // -----------------------------
  const [gateOk, setGateOk] = useState(false);
  const [gatePwd, setGatePwd] = useState("");
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    try {
      const ok = sessionStorage.getItem(GATE_SESSION_KEY) === "1";
      setGateOk(ok);
    } catch {
      setGateOk(false);
    }
  }, []);

  const submitGate = (e) => {
    e.preventDefault();
    setGateError("");

    if (gatePwd === GATE_PASSWORD) {
      try {
        sessionStorage.setItem(GATE_SESSION_KEY, "1");
      } catch {}
      setGateOk(true);
      setGatePwd("");
      return;
    }
    setGateError("Mot de passe incorrect.");
  };

  const logoutGate = () => {
    try {
      sessionStorage.removeItem(GATE_SESSION_KEY);
    } catch {}
    setGateOk(false);
    setGatePwd("");
    setGateError("");
  };

  // -----------------------------
  // Form state
  // -----------------------------
  const [parrains, setParrains] = useState([]);
  const [loadingParrains, setLoadingParrains] = useState(true);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
    parrainId: "",
    societe: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    telephonePortable: "",
    telephoneFixe: "",
    pays: "France",
    role: "agent",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const loadParrains = async () => {
    setLoadingParrains(true);
    try {
      const res = await fetch(`${API}/api/agents/parrains`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setParrains(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger la liste des parrains.");
    } finally {
      setLoadingParrains(false);
    }
  };

  useEffect(() => {
    if (!gateOk) return;
    loadParrains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateOk]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nom || !form.prenom || !form.email || !form.password) {
      return setError("Merci de compléter les champs obligatoires.");
    }
    if (form.password !== form.confirmPassword) {
      return setError("Les mots de passe ne correspondent pas.");
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.agent));

      navigate("/agent/home");
    } catch (e2) {
      console.error(e2);
      try {
        const parsed = JSON.parse(String(e2.message || ""));
        setError(parsed?.message || "Inscription impossible.");
      } catch {
        setError("Inscription impossible (email déjà utilisé ou erreur serveur).");
      }
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // 🔒 Gate UI
  // -----------------------------
  if (!gateOk) {
    return (
      <div className="agent-page">
        <div className="agent-card">
          <div className="agent-title">Accès protégé</div>

          <form onSubmit={submitGate} className="agent-form">
            <div className="field" style={{ width: "100%" }}>
              <label>Mot de passe</label>
              <input
                value={gatePwd}
                onChange={(e) => setGatePwd(e.target.value)}
                type="password"
                placeholder="Saisir le mot de passe"
                autoFocus
              />
            </div>

            {gateError ? <div className="agent-error">{gateError}</div> : null}

            <button className="agent-btn" type="submit">
              Accéder
            </button>

            <div className="agent-foot">
              <Link to="/agent/login">Retour</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Register UI
  // -----------------------------
  return (
    <div className="agent-page">
      <div className="agent-card">
        <div className="agent-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span>Inscription</span>
          <button type="button" className="btn" onClick={logoutGate} title="Verrouiller la page">
            Verrouiller
          </button>
        </div>

        <form onSubmit={submit} className="agent-form">
          {/* Row 1 */}
          <div className="row">
            <div className="field">
              <label>Nom</label>
              <input value={form.nom} onChange={setField("nom")} />
            </div>
            <div className="field">
              <label>Prénom</label>
              <input value={form.prenom} onChange={setField("prenom")} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="row">
            <div className="field">
              <label>Adresse e-mail</label>
              <input value={form.email} onChange={setField("email")} type="email" />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input value={form.password} onChange={setField("password")} type="password" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="row">
            <div className="field">
              <label>Confirmer le Mot de passe</label>
              <input value={form.confirmPassword} onChange={setField("confirmPassword")} type="password" />
            </div>
            <div className="field">
              <label>Parrain</label>
              <select value={form.parrainId} onChange={setField("parrainId")} disabled={loadingParrains}>
                <option value="">{loadingParrains ? "Chargement..." : "— Sélectionnez un parrain —"}</option>
                {parrains.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.prenom} {p.nom} ({p.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="row">
            <div className="field">
              <label>Société</label>
              <input value={form.societe} onChange={setField("societe")} />
            </div>
            <div className="field">
              <label>Numéro SIRET</label>
              <input value={form.siret} onChange={setField("siret")} />
            </div>
          </div>

          {/* Row 5 */}
          <div className="row">
            <div className="field">
              <label>Adresse</label>
              <input value={form.adresse} onChange={setField("adresse")} />
            </div>
            <div className="field">
              <label>Code postal</label>
              <input value={form.codePostal} onChange={setField("codePostal")} />
            </div>
          </div>

          {/* Row 6 */}
          <div className="row">
            <div className="field">
              <label>Ville</label>
              <input value={form.ville} onChange={setField("ville")} />
            </div>
            <div className="field">
              <label>Téléphone portable</label>
              <input value={form.telephonePortable} onChange={setField("telephonePortable")} />
            </div>
          </div>

          {/* Row 6 bis */}
          <div className="row">
            <div className="field">
              <label>Téléphone fixe</label>
              <input value={form.telephoneFixe} onChange={setField("telephoneFixe")} />
            </div>
            <div className="field">
              <label>Pays</label>
              <select value={form.pays} onChange={setField("pays")}>
                <option value="France">France</option>
              </select>
            </div>
          </div>

          {/* Row 7 */}
          <div className="row">
            <div className="field">
              <label>Rôle</label>
              <select value={form.role} onChange={setField("role")}>
                <option value="agent">agent</option>
                <option value="technicien">technicien</option>
                <option value="responsable">responsable</option>
              </select>
            </div>
            <div className="field field-empty" />
          </div>

          {error ? <div className="agent-error">{error}</div> : null}

          <button className="agent-btn" type="submit" disabled={saving}>
            {saving ? "Création..." : "S’inscrire"}
          </button>

          <div className="agent-foot">
            Déjà un compte ? <Link to="/agent/login">Connexion</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
