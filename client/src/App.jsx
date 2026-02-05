import { Navigate, Route, Routes } from "react-router-dom";
import AdminApp from "./pages/AdminApp";
import AgentHome from "./pages/agent/AgentHome";
import AgentMesDevis from "./pages/agent/AgentMesDevis";


// ✅ Tes pages agent (ajuste les chemins selon ton arborescence réelle)
import AgentRegister from "./pages/agent/AgentRegister";
import AgentLogin from "./pages/agent/AgentLogin";


export default function App() {
  return (
    <Routes>
      {/* Admin */}
      <Route path="/" element={<AdminApp />} />

      {/* Agent */}
      <Route path="/agent/register" element={<AgentRegister />} />
      <Route path="/agent/login" element={<AgentLogin />} />
      <Route path="/agent/home" element={<AgentHome />} />
      <Route path="/agent/mes-devis" element={<AgentMesDevis />} />
  


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
