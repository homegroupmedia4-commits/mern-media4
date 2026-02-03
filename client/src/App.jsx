import { useEffect, useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [latest, setLatest] = useState(null);

  // ✅ Vite: variable d'env build-time
  const API = import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com";

  const loadLatest = async () => {
    const res = await fetch(`${API}/api/names/latest`);
    const data = await res.json();
    setLatest(data);
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await fetch(`${API}/api/names`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) throw new Error(await res.text());

    setName("");
    loadLatest();
  };

  useEffect(() => {
    loadLatest();
  }, []);

  return (
    <div style={{ fontFamily: "Arial", padding: 24 }}>
      <h1>Test API Mongo</h1>

      <form onSubmit={saveName} style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tape un prénom (ex: Kevin)"
        />
        <button type="submit">Envoyer</button>
      </form>

      <div style={{ marginTop: 16 }}>
        <strong>Dernier en DB :</strong>{" "}
        {latest?.name ? latest.name : "Aucun pour l’instant"}
      </div>
    </div>
  );
}

export default App;
