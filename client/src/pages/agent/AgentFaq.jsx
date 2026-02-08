// client/src/pages/agent/AgentFaq.jsx
import { useMemo } from "react";
import AgentHeader from "./AgentHeader";
import { USER_KEY } from "./agentHome.helpers";

export default function AgentFaq() {
  const agent = useMemo(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  return (
    <div>
      <AgentHeader agent={agent} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0 }}>F.A.Q</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Page en construction. (Elle existe pour éviter la redirection et permettre la navigation.)
        </p>

        <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>Questions fréquentes</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Comment générer un devis ?</li>
            <li>Où retrouver mes devis ?</li>
            <li>Comment télécharger le PDF ?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
