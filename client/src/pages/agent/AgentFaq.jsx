// client/src/pages/agent/AgentFaq.jsx
import { useMemo, useState } from "react";
import AgentHeader from "./AgentHeader";
import { USER_KEY } from "./agentHome.helpers";

function FaqItem({ q, children, isOpen, onToggle }) {
  return (
    <div style={{ border: "1px solid #d9dde7", background: "#fff" }}>
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

        <span style={{ fontSize: 16, opacity: 0.8, lineHeight: 1 }}>
          {isOpen ? "▾" : "▸"}
        </span>
      </button>

      {isOpen ? (
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
      ) : null}
    </div>
  );
}

function FaqCategory({ title, qas, defaultOpenIndex = 0, singleOpen = true }) {
  // index ouvert (accordéon)
  const [openIdx, setOpenIdx] = useState(
    Number.isFinite(defaultOpenIndex) ? defaultOpenIndex : 0
  );

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: 22, fontWeight: 900 }}>
        {title}
      </h3>

      <div style={{ display: "grid", gap: 0 }}>
        {qas.map((qa, idx) => {
          const isOpen = singleOpen ? openIdx === idx : !!qa.__open; // (singleOpen=true par défaut)
          return (
            <div key={qa.q} style={{ borderTop: idx === 0 ? "1px solid #d9dde7" : 0 }}>
              <FaqItem
                q={qa.q}
                isOpen={isOpen}
                onToggle={() => {
                  if (!singleOpen) return; // garde le mode simple
                  setOpenIdx((prev) => (prev === idx ? -1 : idx));
                }}
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
    <div style={{ marginTop: 22 }}>
      <h2 style={{ margin: "0 0 14px 0", fontSize: 32, fontWeight: 900 }}>{title}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        {items.map((cat) => (
          <FaqCategory
            key={cat.title}
            title={cat.title}
            qas={cat.qas}
            defaultOpenIndex={0}  // ✅ 1er ouvert
            singleOpen={true}     // ✅ un seul ouvert à la fois
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
              <b>pièces, main-d’œuvre et déplacement</b> pendant toute la durée du contrat.
            </>
          ),
        },
        {
          q: "Que se passe-t-il à la fin du contrat de location-maintenance ?",
          a: (
            <>
              Soit un <b>nouveau contrat</b> est signé (mensualités similaires mais matériel plus récent), soit le{" "}
              <b>matériel est récupéré</b>.
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
              Oui, grâce à nos écrans <b>haute luminosité</b> jusqu’à <b>4 500 candelas</b>, parfaitement visibles même
              en plein soleil.
            </>
          ),
        },
      ],
    },
    {
      title: "3 – Installation & Pré-requis",
      qas: [
        {
          q: "De quoi ai-je besoin avant l’installation ?",
          a: (
            <>
              Vous devez <b>tirer les câbles d’alimentation</b> et les câbles <b>RJ45</b> et les laisser en attente.
              Un email précisant le nombre et la position sera envoyé après la commande.
            </>
          ),
        },
        {
          q: "Qu’est-ce que je mets derrière mon écran ?",
          a: (
            <>
              L’écran est livré et installé <b>sans habillage</b>. Pour un habillage spécifique, un <b>devis</b> est
              nécessaire.
            </>
          ),
        },
      ],
    },
    {
      title: "4 – Contenu & Logiciel",
      qas: [
        {
          q: "Est-ce que je peux changer les images moi-même ?",
          a: (
            <>
              Oui, grâce à notre logiciel très simple d’utilisation. Vous pouvez changer les images, vidéos,
              programmer les jours et heures, <b>en local ou à distance</b>.
            </>
          ),
        },
      ],
    },
    {
      title: "5 – Réglementation & Autorisations",
      qas: [
        {
          q: "Est-ce que j’ai le droit de mettre un écran en vitrine ?",
          a: (
            <>
              Dans la majorité des cas, <b>oui</b>, car l’écran est à l’intérieur du magasin. En zone classée ou
              réglementée, c’est au commerçant de vérifier la faisabilité auprès des autorités locales.
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
        { q: "Article n°1", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
        { q: "Article n°2", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
        { q: "Article n°3", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
      ],
    },
    {
      title: "Paramétrage écran",
      qas: [
        { q: "Article n°1", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
        { q: "Article n°2", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
        { q: "Article n°3", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus..." },
      ],
    },
  ];

  return (
    <div>
      <AgentHeader agent={agent} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 60px" }}>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 1000 }}>FAQ</h1>

        {showAgentFaq ? <FaqSection title="FAQ agents" items={AGENT_FAQ} /> : null}
        {showTechFaq ? <FaqSection title="FAQ techniciens" items={TECH_FAQ} /> : null}

        {!showAgentFaq && !showTechFaq ? (
          <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            Aucun contenu FAQ pour ce rôle.
          </div>
        ) : null}
      </div>
    </div>
  );
}
