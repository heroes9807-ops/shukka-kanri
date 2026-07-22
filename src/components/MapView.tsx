import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useEffect } from "react";
import type { PickupPoint, Driver, DriverRoute, DailyPickupEntry } from "../types";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];
const CENTER = { lat: 35.6762, lng: 139.6503 };
const LIBRARIES: ("places" | "geometry")[] = [];

interface MapViewProps {
  entries: DailyPickupEntry[];
  pickupPointsMaster: PickupPoint[];
  drivers: Driver[];
  routes: DriverRoute[];
}

export function MapView({ entries, pickupPointsMaster, drivers, routes }: MapViewProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, libraries: LIBRARIES });
  const [directions, setDirections] = useState<Record<string, google.maps.DirectionsResult>>({});

  useEffect(() => {
    if (!isLoaded || routes.length === 0) return;
    const svc = new google.maps.DirectionsService();
    routes.forEach((route) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (!driver || route.stops.length === 0) return;
      const stops = route.stops
        .sort((a, b) => a.order - b.order)
        .map((s) => {
          const entry = entries.find((e) => e.id === s.entryId);
          if (!entry) return undefined;
          return pickupPointsMaster.find((p) => p.id === entry.pickupPointId);
        })
        .filter(Boolean) as PickupPoint[];
      if (stops.length === 0) return;
      const waypoints = stops.slice(0, -1).map((p) => ({ location: p.address, stopover: true }));
      svc.route({
        origin: driver.startLocation,
        destination: stops[stops.length - 1].address,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      }, (result, status) => {
        if (status === "OK" && result) {
          setDirections((prev) => ({ ...prev, [route.driverId]: result }));
        }
      });
    });
  }, [isLoaded, routes, drivers, entries, pickupPointsMaster]);

  if (!isLoaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>地図を読み込んでいます...</div>;

  const activePoints = entries
    .map((e) => pickupPointsMaster.find((p) => p.id === e.pickupPointId))
    .filter(Boolean) as PickupPoint[];

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={CENTER}
      zoom={12}
    >
      {activePoints.map((p) => (
        p.lat && p.lng ? (
          <Marker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.name} />
        ) : null
      ))}
      {Object.entries(directions).map(([driverId, result], i) => (
        <DirectionsRenderer
          key={driverId}
          directions={result}
          options={{
            polylineOptions: { strokeColor: COLORS[i % COLORS.length], strokeWeight: 4 },
            suppressMarkers: false,
          }}
        />
      ))}
    </GoogleMap>
  );
}
