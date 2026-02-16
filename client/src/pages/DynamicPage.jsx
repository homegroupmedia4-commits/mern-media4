// client/src/pages/DynamicPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const safe = (v) => String(v ?? "").trim();

export default function DynamicPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const API = useMemo(
    () => import.meta.env.VITE_API_URL || "https://mern-media4-server.onrender.com",
    []
  );

  const [page, setPage] = useState(null);
  const [err, setErr] = useState("");

  // PWA install
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    let on = true;
    setErr("");
    setPage(null);

    fetch(`${API}/api/pages/public/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => {
        if (!on) return;
        setPage(j.page);
      })
      .catch(() => on && setErr("NOT_FOUND"));

    return () => (on = false);
  }, [API, slug]);

  // ✅ si PWA, forcer le slash final pour être dans le scope /slug/
  useEffect(() => {
    if (!page?.isPwa) return;
    if (loc.pathname === `/${slug}`) {
      nav(`/${slug}/`, { replace: true });
    }
  }, [page, slug, loc.pathname, nav]);

  // ✅ inject manifest + theme-color + title (sans helmet)
  useEffect(() => {
    if (!page?.isPwa) return;

    const manifestHref = `/${slug}/manifest.webmanifest`;

    let link = document.querySelector('link[rel="manifest"][data-dyn="1"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "manifest");
      link.setAttribute("data-dyn", "1");
      document.head.appendChild(link);
    }
    link.setAttribute("href", manifestHref);

    let theme = document.querySelector('meta[name="theme-color"][data-dyn="1"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.setAttribute("name", "theme-color");
      theme.setAttribute("data-dyn", "1");
      document.head.appendChild(theme);
    }
    theme.setAttribute("content", page.pwaThemeColor || "#000000");

    document.title = safe(page.title) || slug;
  }, [page, slug]);

  // ✅ register SW seulement si isPwa
  useEffect(() => {
    if (!page?.isPwa) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(`/${slug}/sw.js`, { scope: `/${slug}/` })
      .catch(() => {});
  }, [page, slug]);

  // ✅ Capture l’event d’installation (Chrome/Edge/Android)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // si déjà installé (ou sur iOS), pas de prompt
    window.addEventListener("appinstalled", () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    try {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  }

  if (err) return <div style={{ padding: 24 }}>Page introuvable</div>;
  if (!page) return <div style={{ padding: 24 }}>Chargement…</div>;

  const title = safe(page.title) || slug;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>

      {page.isPwa ? (
        <div style={{ margin: "12px 0" }}>
          {canInstall ? (
            <button
              onClick={handleInstall}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                border: "1px solid #d9dce7",
                cursor: "pointer",
                fontWeight: 800,
                background: "#fff",
              }}
            >
              Installer l’application
            </button>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Si ton navigateur le permet, tu verras aussi l’icône “Installer” dans la barre d’adresse.
            </div>
          )}
        </div>
      ) : null}

      <div>{safe(page.content) || title}</div>
    </div>
  );
}
