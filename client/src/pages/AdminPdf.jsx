// client/src/pages/AdminPdf.jsx
import { useOutletContext } from "react-router-dom";

export default function AdminPdf() {
  // Si plus tard tu veux appeler l’API, elle est dispo ici :
  // const { API } = useOutletContext();

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ margin: 0 }}>PDF</h2>
      <p style={{ marginTop: 8, opacity: 0.7 }}>
        Page vide — on la complètera après.
      </p>
    </div>
  );
}
