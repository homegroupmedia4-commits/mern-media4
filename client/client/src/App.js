import { useEffect, useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [latest, setLatest] = useState(null);

  const API = import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com";
  console.log("API =", API);

  const loadLatest = async () => {
    try {
      const res = await fetch(`${API}/api/names/latest`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLatest(data);
    } catch (err) {
      console.error("loadLatest error:", err);
    }
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(`${API}/api/names`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());

      setName("");
      loadLatest();
    } catch (err) {
      console.error("saveName error:", err);
      alert("Erreur API (regarde la console)");
    }
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
