import { useMemo, useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface MapInputProps {
  onChange: (location: LatLngLiteral, address: string) => void;
}

const MapInput = ({ onChange }: MapInputProps) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<LatLngLiteral | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const center = useMemo(() => ({ lat: -23.55052, lng: -46.633308 }), []); // Default to São Paulo

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const newPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        setMarkerPosition(newPosition);
        // Note: We can't get a reliable address from a click, so we pass coordinates
        onChange(newPosition, `${newPosition.lat}, ${newPosition.lng}`);
      }
    },
    [onChange]
  );

  const handlePlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const newPosition = place.geometry?.location?.toJSON();
      const address = place.formatted_address ?? "";

      if (newPosition && map) {
        setMarkerPosition(newPosition);
        onChange(newPosition, address);
        map.panTo(newPosition);
        map.setZoom(15);
      }
    } else {
      console.error("Autocomplete is not loaded yet!");
    }
  };

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  return (
    <div className="space-y-2">
      <Autocomplete
        onLoad={(ac) => setAutocomplete(ac)}
        onPlaceChanged={handlePlaceChanged}
      >
        <input
          type="text"
          placeholder="Search for a location"
        />
      </Autocomplete>
      <div style={{ height: "250px", width: "100%" }}>
        <GoogleMap
          mapContainerStyle={{
            width: "100%",
            height: "100%",
            borderRadius: "0.5rem",
          }}
          center={center}
          zoom={10}
          onClick={handleMapClick}
          onLoad={(map) => setMap(map)}
        >
          {markerPosition && <Marker position={markerPosition} />}
        </GoogleMap>
      </div>
    </div>
  );
};

export default MapInput;
