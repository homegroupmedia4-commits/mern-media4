import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const safe = (v) => String(v ?? "").trim();

export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    fetch(`/api/pages/public/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => {
        if (!on) return;
        setPage(j.page);
      })
      .catch(() => on && setErr("NOT_FOUND"));
    return () => (on = false);
  }, [slug]);

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
    <>
      {page.isPwa && (
        <Helmet>
          <link rel="manifest" href={`/${slug}/manifest.webmanifest`} />
          <meta name="theme-color" content={page.pwaThemeColor || "#000000"} />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <title>{title}</title>
        </Helmet>
      )}

      <div style={{ padding: 24 }}>
        <h1>{title}</h1>
        <div>{safe(page.content) || title}</div>
      </div>
    </>
  );
}
