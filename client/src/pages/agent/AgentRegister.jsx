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

const API = "";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const generatePassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$%&*?-_";
    const all = upper + lower + digits + symbols;

    const mandatory = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const rest = Array.from({ length: 8 }, () =>
      all[Math.floor(Math.random() * all.length)]
    );

    const pwd = [...mandatory, ...rest]
      .sort(() => Math.random() - 0.5)
      .join("");

    setForm((p) => ({ ...p, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
    setShowConfirm(true);
    setCopied(false);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = form.password;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    value={form.password}
                    onChange={setField("password")}
                    type={showPassword ? "text" : "password"}
                    style={{ width: "100%", paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Cacher" : "Voir"}
                    style={{
                      position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1,
                    }}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  title="Générer un mot de passe sécurisé"
                  style={{
                    height: 40, padding: "0 10px", border: "1px solid #d8dbe6", borderRadius: 10,
                    background: "#f6f7fb", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  Générer
                </button>
                {form.password && (
                  <button
                    type="button"
                    onClick={copyPassword}
                    title="Copier le mot de passe"
                    style={{
                      height: 40, padding: "0 10px", border: "1px solid #d8dbe6", borderRadius: 10,
                      background: copied ? "#e6f4d7" : "#f6f7fb", cursor: "pointer", fontSize: 13,
                      fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                      transition: "background 200ms",
                    }}
                  >
                    {copied ? "Copié !" : "Copier"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="row">
            <div className="field">
              <label>Confirmer le Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  value={form.confirmPassword}
                  onChange={setField("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  style={{ width: "100%", paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  title={showConfirm ? "Cacher" : "Voir"}
                  style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1,
                  }}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
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
