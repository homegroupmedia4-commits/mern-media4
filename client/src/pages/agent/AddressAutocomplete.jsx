import { useEffect, useRef } from "react";

export default function AddressAutocomplete({ value, onChange, onPlaceSelected, placeholder, className }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "fr" },
      fields: ["address_components"],
      types: ["address"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.address_components) return;

      const get = (type) =>
        place.address_components.find((c) => c.types.includes(type))?.long_name || "";

      const adresse1 = [get("street_number"), get("route")].filter(Boolean).join(" ");
      const codePostal = get("postal_code");
      const ville = get("locality") || get("postal_town");

      onPlaceSelected?.({ adresse1, codePostal, ville });
      onChange?.(adresse1);
    });
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
