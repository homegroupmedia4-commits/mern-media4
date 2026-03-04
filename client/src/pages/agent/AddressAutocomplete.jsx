// client/src/pages/agent/AddressAutocomplete.jsx
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

  // ✅ garde l'input synchro quand tu changes value via onPlaceSelected
  useEffect(() => {
    if (!inputRef.current) return;
    if (typeof value === "string" && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    // ✅ si déjà attaché à CE input, on ne refait pas
    if (autocompleteRef.current?.__attachedTo === inputRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "FR" },
      fields: ["address_components"],
      types: ["address"],
    });

    ac.__attachedTo = inputRef.current;
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
  }, [googleLoaded, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      autoComplete="off"
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
      defaultValue={value}
    />
  );
}
