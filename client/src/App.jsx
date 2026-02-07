import { Navigate, Route, Routes } from "react-router-dom";

/* ================= ADMIN ================= */
import AdminApp from "./pages/AdminApp";
import AdminNosDevis from "./pages/AdminNosDevis";
import AdminAgents from "./pages/AdminAgents";
import AdminProduits from "./pages/AdminProduits";
import AdminFixation from "./pages/AdminFixation";
import AdminFinition from "./pages/AdminFinition";
import TaillesEcrans from "./pages/TaillesEcrans";
import ValeursStatiques from "./pages/ValeursStatiques";
import CategoriesPitch from "./pages/CategoriesPitch";

/* ================= AGENT ================= */
import AgentHome from "./pages/agent/AgentHome";
import AgentLogin from "./pages/agent/AgentLogin";

export default function App() {
  return (
    <Routes>
      {/* ================= ROOT ================= */}
      <Route path="/" element={<Navigate to="/agent/login" replace />} />

      {/* ================= ADMIN ================= */}
      <Route path="/adminmedia4" element={<AdminApp />}>
        <Route index element={<Navigate to="nosdevis" replace />} />

        <Route path="nosdevis" element={<AdminNosDevis />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="produits" element={<AdminProduits />} />
        <Route path="fixation" element={<AdminFixation />} />
        <Route path="finition" element={<AdminFinition />} />
        <Route path="tailles-ecrans" element={<TaillesEcrans />} />
        <Route path="valeurs-statiques" element={<ValeursStatiques />} />
        <Route path="categories-pitch" element={<CategoriesPitch />} />
      </Route>

      {/* 👉 fallback ADMIN (CRITIQUE pour éviter /agent/login) */}
      <Route
        path="/adminmedia4/*"
        element={<Navigate to="/adminmedia4" replace />}
      />

      {/* ================= AGENT ================= */}
      <Route path="/agent/login" element={<AgentLogin />} />
      <Route path="/agent/home" element={<AgentHome />} />

      {/* ================= GLOBAL FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/agent/login" replace />} />
    </Routes>
  );
}
