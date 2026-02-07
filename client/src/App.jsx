// client/src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import AdminApp from "./pages/AdminApp";

// admin pages (wrappers)
import NosDevisPage from "./pages/NosDevisPage";
import AjoutPitchPage from "./pages/AjoutPitchPage";
import TableauPitchPage from "./pages/TableauPitchPage";
import CategoriePitchPage from "./pages/CategoriePitchPage";

import AjouterAutreProduitPage from "./pages/AjouterAutreProduitPage";
import TableauAutreProduitPage from "./pages/TableauAutreProduitPage";
import AjouteMemoirePage from "./pages/AjouteMemoirePage";
import TableauMemoirePage from "./pages/TableauMemoirePage";

import ProduitPage from "./pages/ProduitPage";
import CoefficientMontantPage from "./pages/CoefficientMontantPage";
import DureeLeasingPage from "./pages/DureeLeasingPage";
import FixationPage from "./pages/FixationPage";
import FinitionPage from "./pages/FinitionPage";
import AgentsPage from "./pages/AgentsPage";

// agent pages
import AgentHome from "./pages/agent/AgentHome";
import AgentMesDevis from "./pages/agent/AgentMesDevis";
import AgentRegister from "./pages/agent/AgentRegister";
import AgentLogin from "./pages/agent/AgentLogin";

export default function App() {
  return (
    <Routes>
      {/* ✅ HOME du site => agent login */}
      <Route path="/" element={<Navigate to="/agent/login" replace />} />

      {/* ---------------- ADMIN ---------------- */}
      <Route path="/adminmedia4" element={<AdminApp />}>
        {/* redirection root admin */}
        <Route index element={<Navigate to="nosdevis" replace />} />

        {/* 1 */}
        <Route path="nosdevis" element={<NosDevisPage />} />

        {/* 2 Pitchs */}
        <Route path="pitchs/ajoutpitch" element={<AjoutPitchPage />} />
        <Route path="pitchs/tableaupitch" element={<TableauPitchPage />} />
        <Route path="pitchs/categoriepitch" element={<CategoriePitchPage />} />

        {/* 3 Autres produits */}
        <Route path="autres-produits/ajouterautreproduit" element={<AjouterAutreProduitPage />} />
        <Route path="autres-produits/tableauautreproduit" element={<TableauAutreProduitPage />} />
        <Route path="autres-produits/ajoutememoire" element={<AjouteMemoirePage />} />
        <Route path="autres-produits/tableaumemoire" element={<TableauMemoirePage />} />

        {/* 4 Configuration */}
        <Route path="configuration/produit" element={<ProduitPage />} />
        <Route path="configuration/coefficient-montant" element={<CoefficientMontantPage />} />
        <Route path="configuration/dureeleasing" element={<DureeLeasingPage />} />
        <Route path="configuration/fixation" element={<FixationPage />} />
        <Route path="configuration/finition" element={<FinitionPage />} />

        {/* 5 Agent */}
        <Route path="agent" element={<AgentsPage />} />
      </Route>

      {/* ---------------- AGENT (public routes) ---------------- */}
      <Route path="/agent/register" element={<AgentRegister />} />
      <Route path="/agent/login" element={<AgentLogin />} />
      <Route path="/agent/home" element={<AgentHome />} />
      <Route path="/agent/mes-devis" element={<AgentMesDevis />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/agent/login" replace />} />
    </Routes>
  );
}
