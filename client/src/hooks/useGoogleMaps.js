import { useEffect, useState } from "react";

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google);

  useEffect(() => {
    if (window.google) { setLoaded(true); return; }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_KEY}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  return loaded;
}
