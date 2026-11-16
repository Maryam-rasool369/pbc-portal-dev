"use client";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  location: { lat: number; lng: number };
  setLocation: (loc: { lat: number; lng: number }) => void;
}

export default function MapView({ location, setLocation }: Props) {
  useEffect(() => {
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
        iconUrl: "/leaflet/images/marker-icon.png",
        shadowUrl: "/leaflet/images/marker-shadow.png",
      });
    });
  }, []);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setLocation(e.latlng);
      },
    });
    return <Marker position={location} />;
  };

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
}
