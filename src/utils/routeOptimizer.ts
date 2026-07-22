import type { PickupPoint, Driver, DailyPickupEntry, DriverRoute } from "../types";

export async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + apiKey + "&language=ja";
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results.length > 0) {
    return data.results[0].geometry.location;
  }
  return null;
}

export function assignEntriesToDrivers(
  entries: DailyPickupEntry[],
  driverIds: string[],
  date: string
): DriverRoute[] {
  if (driverIds.length === 0 || entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => {
    if (a.timeWindowStart && b.timeWindowStart) return a.timeWindowStart.localeCompare(b.timeWindowStart);
    if (a.timeWindowStart) return -1;
    if (b.timeWindowStart) return 1;
    return 0;
  });
  const routes: DriverRoute[] = driverIds.map((id) => ({ driverId: id, date, stops: [] }));
  sorted.forEach((entry, i) => {
    const route = routes[i % driverIds.length];
    route.stops.push({
      entryId: entry.id,
      order: route.stops.length + 1,
      estimatedArrival: entry.timeWindowStart || undefined,
      estimatedDuration: 15,
    });
  });
  return routes;
}

export function generateNavUrl(
  route: DriverRoute,
  driver: Driver,
  entries: DailyPickupEntry[],
  pickupPointsMaster: PickupPoint[]
): string {
  const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
  const addresses = sortedStops
    .map((s) => {
      const entry = entries.find((e) => e.id === s.entryId);
      if (!entry) return undefined;
      return pickupPointsMaster.find((p) => p.id === entry.pickupPointId)?.address;
    })
    .filter((a): a is string => !!a);

  const origin = encodeURIComponent(driver.startLocation);
  const destination = encodeURIComponent(driver.endLocation || driver.startLocation);
  const waypoints = addresses.map(encodeURIComponent).join("|");

  let url = "https://www.google.com/maps/dir/?api=1&origin=" + origin + "&destination=" + destination + "&travelmode=driving";
  if (waypoints) {
    url += "&waypoints=" + waypoints;
  }
  return url;
}
