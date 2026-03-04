// client/src/hooks/useGoogleMaps.js
import { useEffect, useState } from "react";

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google?.maps?.places);

  useEffect(() => {
    if (window.google?.maps?.places) { setLoaded(true); return; }

    const existing = document.getElementById("google-maps");
    if (existing) {
      existing.addEventListener("load", () => setLoaded(!!window.google?.maps?.places));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps";
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${import.meta.env.VITE_GOOGLE_PLACES_KEY}` +
      `&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;

    script.onload = () => setLoaded(!!window.google?.maps?.places);
    script.onerror = () => setLoaded(false);

    document.head.appendChild(script);
  }, []);

  return loaded;
}
