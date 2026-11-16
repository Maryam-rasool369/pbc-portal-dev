"use client";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  location: { lat: number; lng: number };
}

const customIcon = new L.Icon({
  iconUrl: "/leaflet/images/marker-icon.png",
  iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
  shadowUrl: "/leaflet/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ReadOnlyMapView({ location }: Props) {
  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[location.lat, location.lng]} icon={customIcon} />
    </MapContainer>
  );
}
