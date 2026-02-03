import { useEffect, useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [latest, setLatest] = useState(null);

  // IMPORTANT : depuis TON navigateur, "localhost" = TON PC, pas Codespaces.
  // Donc on utilise l'URL publique du backend (port 10000).
  const API = "https://ubiquitous-acorn-x56pq7p4p5wjc9vrq-10000.app.github.dev";

  const loadLatest = async () => {
    const res = await fetch(`${API}/api/names/latest`);
    const data = await res.json();
    setLatest(data);
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch(`${API}/api/names`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setName("");
    loadLatest();
  };

  useEffect(() => {
    loadLatest();
  }, []);

  return (
    <div style={{ fontFamily: "Arial", padding: 24 }}>
      <h1>Test API Mongo ✅</h1>

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
        {latest?.value ? latest.value : "Aucun pour l’instant"}
      </div>
    </div>
  );
}

export default App;
