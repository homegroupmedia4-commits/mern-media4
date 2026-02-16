import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const safe = (v) => String(v ?? "").trim();

export default function DynamicPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const [page, setPage] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    setErr("");
    setPage(null);

    fetch(`/api/pages/public/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => {
        if (!on) return;
        setPage(j.page);
      })
      .catch(() => on && setErr("NOT_FOUND"));

    return () => (on = false);
  }, [slug]);

  // ✅ Si PWA, forcer le slash final pour être dans le scope /slug/
  useEffect(() => {
    if (!page?.isPwa) return;
    if (loc.pathname === `/${slug}`) {
      nav(`/${slug}/`, { replace: true });
    }
  }, [page, slug, loc.pathname, nav]);

  // ✅ Injecter manifest/meta/title uniquement si isPwa (sans helmet)
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

    let ios = document.querySelector(
      'meta[name="apple-mobile-web-app-capable"][data-dyn="1"]'
    );
    if (!ios) {
      ios = document.createElement("meta");
      ios.setAttribute("name", "apple-mobile-web-app-capable");
      ios.setAttribute("content", "yes");
      ios.setAttribute("data-dyn", "1");
      document.head.appendChild(ios);
    }

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

  if (err) return <div style={{ padding: 24 }}>Page introuvable</div>;
  if (!page) return <div style={{ padding: 24 }}>Chargement…</div>;

  const title = safe(page.title) || slug;

  return (
    <div style={{ padding: 24 }}>
      <h1>{title}</h1>
      <div>{safe(page.content) || title}</div>
    </div>
  );
}
