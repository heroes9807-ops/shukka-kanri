import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useEffect } from "react";
import type { PickupPoint, Driver, DriverRoute, DailyPickupEntry } from "../types";

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];
const CENTER = { lat: 35.6762, lng: 139.6503 };

interface MapViewProps {
  entries: DailyPickupEntry[];
  pickupPointsMaster: PickupPoint[];
  drivers: Driver[];
  routes: DriverRoute[];
  isLoaded: boolean;
}

export function MapView({ entries, pickupPointsMaster, drivers, routes, isLoaded }: MapViewProps) {
  const [directions, setDirections] = useState<Record<string, google.maps.DirectionsResult>>({});

  useEffect(() => {
    if (!isLoaded || routes.length === 0) return;
    setDirections({});
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
        {drivers.map((driver, i) => {
          const result = directions[driver.id];
          if (!result) return null;
          return (
            <DirectionsRenderer
              key={driver.id}
              directions={result}
              options={{
                polylineOptions: { strokeColor: COLORS[i % COLORS.length], strokeWeight: 4 },
                suppressMarkers: false,
              }}
            />
          );
        })}
      </GoogleMap>
      {drivers.length > 0 && (
        <div
          style={{
            position: "absolute", top: 12, right: 12, background: "#fff",
            borderRadius: 8, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontSize: 13, minWidth: 120,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#334155" }}>ドライバー</div>
          {drivers.map((driver, i) => (
            <div key={driver.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ width: 16, height: 4, borderRadius: 2, background: COLORS[i % COLORS.length], display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#334155" }}>{driver.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
