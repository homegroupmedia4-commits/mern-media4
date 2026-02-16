// client/src/App.jsx
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
import PitchManagerPage from "./pages/PitchManager";

/* ================= AGENT ================= */
import AgentHome from "./pages/agent/AgentHome";
import AgentLogin from "./pages/agent/AgentLogin";
import AgentRegister from "./pages/agent/AgentRegister";
import AgentMesDevis from "./pages/agent/AgentMesDevis";
import AgentFaq from "./pages/agent/AgentFaq";


import DynamicPage from "./pages/DynamicPage";
import AdminPages from "./pages/AdminPages";





/* ================= AUTH GUARDS ================= */
const AGENT_TOKEN_KEY = "agent_token_v1";

function RequireAgentAuth({ children }) {
  const token = localStorage.getItem(AGENT_TOKEN_KEY);
  if (!token) return <Navigate to="/agent/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ================= ROOT ================= */}
      <Route path="/" element={<Navigate to="/agent/login" replace />} />

      {/* ================= ADMIN ================= */}
      <Route path="/adminmedia4" element={<AdminApp />}>
        <Route index element={<Navigate to="nosdevis" replace />} />
        <Route path="nosdevis" element={<AdminNosDevis />} />

        <Route path="pages" element={<AdminPages />} />


        {/* ✅ Pitchs */}
        <Route path="pitchs" element={<Navigate to="pitchs/ajoutpitch" replace />} />
        <Route path="pitchs/:slug" element={<PitchManagerPage />} />
        <Route path="categories-pitch" element={<CategoriesPitch />} />

        <Route path="agents" element={<AdminAgents />} />
        <Route path="produits" element={<AdminProduits />} />
        <Route path="fixation" element={<AdminFixation />} />
        <Route path="finition" element={<AdminFinition />} />

        <Route path="produits" element={<AdminProduits />} />


        {/* ✅ Tailles écrans + onglets via slug */}
        <Route
          path="tailles-ecrans"
          element={<Navigate to="tailles-ecrans/ajouterautreproduit" replace />}
        />
        <Route path="tailles-ecrans/:slug" element={<TaillesEcrans />} />

        {/* ✅ Valeurs statiques via slug */}
        <Route
          path="valeurs-statiques"
          element={<Navigate to="valeurs-statiques/dureeleasing" replace />}
        />
        <Route path="valeurs-statiques/:slug" element={<ValeursStatiques />} />
      </Route>

      {/* ✅ SHORTCUTS (URLs “propres”) */}
      <Route
        path="/ajouterautreproduit"
        element={<Navigate to="/adminmedia4/tailles-ecrans/ajouterautreproduit" replace />}
      />
      <Route
        path="/tableauautreproduit"
        element={<Navigate to="/adminmedia4/tailles-ecrans/tableauautreproduit" replace />}
      />
      <Route
        path="/ajoutememoire"
        element={<Navigate to="/adminmedia4/tailles-ecrans/ajoutememoire" replace />}
      />
      <Route
        path="/tableaumemoire"
        element={<Navigate to="/adminmedia4/tailles-ecrans/tableaumemoire" replace />}
      />

      {/* ✅ fallback ADMIN */}
      <Route path="/adminmedia4/*" element={<Navigate to="/adminmedia4" replace />} />

      {/* ================= AGENT ================= */}
      <Route path="/agent/login" element={<AgentLogin />} />

      {/* ✅ accessible librement */}
      <Route path="/agent/register" element={<AgentRegister />} />

      {/* ✅ pages protégées */}
      <Route
        path="/agent/home"
        element={
          <RequireAgentAuth>
            <AgentHome />
          </RequireAgentAuth>
        }
      />

      <Route
        path="/agent/mes-devis"
        element={
          <RequireAgentAuth>
            <AgentMesDevis />
          </RequireAgentAuth>
        }
      />

      <Route
        path="/agent/faq"
        element={
          <RequireAgentAuth>
            <AgentFaq />
          </RequireAgentAuth>
        }
      />

      <Route path="/:slug" element={<DynamicPage />} />


      {/* ================= GLOBAL FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/agent/login" replace />} />
    </Routes>
  );
}
