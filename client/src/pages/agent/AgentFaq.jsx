// client/src/pages/agent/AgentFaq.jsx
import { useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { USER_KEY } from "./agentHome.helpers";

function FaqItem({ q, children, isOpen, onToggle }) {
  return (
    <div
      style={{
        border: "1px solid #d9dde7",
        background: "#fff",
        margin: 0, // ✅ suppression marges
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          border: 0,
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={isOpen}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>–</span>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{q}</span>
        </div>

        <span style={{ fontSize: 16, opacity: 0.8 }}>
          {isOpen ? "▾" : "▸"}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: "18px 16px",
            color: "#5d6475",
            lineHeight: 1.7,
            borderTop: "1px solid #d9dde7",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function FaqCategory({ title, qas, defaultOpenIndex = 0 }) {
  const [openIdx, setOpenIdx] = useState(defaultOpenIndex);

  return (
    <div style={{ margin: 0 }}> {/* ✅ suppression marges */}
      <h3
        style={{
          margin: "0 0 8px 0", // 🔽 réduit
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          display: "grid",
          gap: 0, // ✅ IMPORTANT → blocs collés
        }}
      >
        {qas.map((qa, idx) => {
          const isOpen = openIdx === idx;

          return (
            <div
              key={qa.q}
              style={{
                borderTop: idx === 0 ? "1px solid #d9dde7" : 0,
                margin: 0, // ✅ suppression marges
              }}
            >
              <FaqItem
                q={qa.q}
                isOpen={isOpen}
                onToggle={() =>
                  setOpenIdx((prev) => (prev === idx ? -1 : idx))
                }
              >
                {qa.a}
              </FaqItem>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FaqSection({ title, items }) {
  return (
    <div
      style={{
        marginTop: 16, // 🔽 réduit
      }}
    >
      <h2
        style={{
          margin: "0 0 10px 0", // 🔽 réduit
          fontSize: 32,
          fontWeight: 900,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 12, // 🔽 réduit au lieu de 22
          alignItems: "start",
        }}
      >
        {items.map((cat) => (
          <FaqCategory
            key={cat.title}
            title={cat.title}
            qas={cat.qas}
            defaultOpenIndex={0}
          />
        ))}
      </div>
    </div>
  );
}

export default function AgentFaq() {
  const agent = useMemo(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const role = String(agent?.role || "agent");

  const showAgentFaq = role === "agent" || role === "responsable";
  const showTechFaq = role === "technicien" || role === "responsable";

  const AGENT_FAQ = [
    {
      title: "1 – Garantie & Fin de contrat",
      qas: [
        {
          q: "Est-ce que le matériel est garanti ?",
          a: (
            <>
              Pour un achat, le matériel est garanti <b>pièces</b>. Pour un leasing, le matériel est garanti{" "}
              <b>pièces, main-d’œuvre et déplacement</b>.
            </>
          ),
        },
        {
          q: "Que se passe-t-il à la fin du contrat ?",
          a: (
            <>
              Soit un <b>nouveau contrat</b> est signé, soit le <b>matériel est récupéré</b>.
            </>
          ),
        },
      ],
    },
    {
      title: "2 – Performance & Visibilité",
      qas: [
        {
          q: "Est-ce qu’on voit un écran au soleil ?",
          a: (
            <>
              Oui, grâce à nos écrans <b>jusqu’à 4 500 candelas</b>.
            </>
          ),
        },
      ],
    },
  ];

  const TECH_FAQ = [
    {
      title: "Installation écran",
      qas: [
        { q: "Article n°1", a: "Lorem ipsum..." },
        { q: "Article n°2", a: "Lorem ipsum..." },
      ],
    },
  ];

  return (
    <div>
      <AgentHeader agent={agent} />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 16px 40px", // 🔽 réduit
        }}
      >
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 1000 }}>
          FAQ
        </h1>

        {showAgentFaq && (
          <FaqSection title="FAQ agents" items={AGENT_FAQ} />
        )}

        {showTechFaq && (
          <FaqSection title="FAQ techniciens" items={TECH_FAQ} />
        )}

        {!showAgentFaq && !showTechFaq && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 12,
            }}
          >
            Aucun contenu FAQ pour ce rôle.
          </div>
        )}
      </div>
    </div>
  );
}
