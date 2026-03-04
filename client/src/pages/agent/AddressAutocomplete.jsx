import { useEffect, useRef } from "react";

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  className,
  googleLoaded,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;
    if (autocompleteRef.current) return;

    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "FR" },
        fields: ["address_components"],
        types: ["address"],
      });

      autocompleteRef.current = ac;

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.address_components) return;

        const get = (type) =>
          place.address_components.find((c) => c.types.includes(type))?.long_name || "";

        const adresse1 = [get("street_number"), get("route")].filter(Boolean).join(" ");
        const codePostal = get("postal_code");
        const ville = get("locality") || get("postal_town");

        onPlaceSelected?.({ adresse1, codePostal, ville });
      });
    } catch (e) {
      console.error("Autocomplete init failed:", e);
    }
  }, [googleLoaded, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
