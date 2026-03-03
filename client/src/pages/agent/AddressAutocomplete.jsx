import { useEffect, useRef } from "react";

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  className,
  googleLoaded, // ✅ reçoit googleLoaded en prop
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // ✅ Se relance quand googleLoaded devient true
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;
    if (autocompleteRef.current) return; // déjà initialisé

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: "fr" },
        fields: ["address_components"],
        types: ["address"],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.address_components) return;

      const get = (type) =>
        place.address_components.find((c) => c.types.includes(type))
          ?.long_name || "";

      const adresse1 = [get("street_number"), get("route")]
        .filter(Boolean)
        .join(" ");
      const codePostal = get("postal_code");
      const ville = get("locality") || get("postal_town");

      onPlaceSelected?.({ adresse1, codePostal, ville });
    });
  }, [googleLoaded]); // ✅ dépend de googleLoaded

  return (
    <input
      ref={inputRef}
      defaultValue={value} // ✅ NON contrôlé (évite le conflit React/Google)
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
