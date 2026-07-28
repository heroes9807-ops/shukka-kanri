import type { PickupPoint, Driver, DailyPickupEntry, DriverRoute, DriverDayAvailability } from "../types";

const FALLBACK_TRAVEL_MINUTES = 15; // Google側から移動時間が取れなかった場合の仮の見積もり

export async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + apiKey + "&language=ja";
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results.length > 0) {
    return data.results[0].geometry.location;
  }
  return null;
}

// addresses[i] → addresses[j] の車移動時間(分)の一覧表をGoogleマップからまとめて取得する。
// distancematrix/directionsのRESTエンドポイントはブラウザからのfetchをCORSでブロックするため、
// 地図タブと同じ「Google Maps JavaScript SDK(google.maps.DistanceMatrixService)」経由で取得する。
export async function getTravelTimeMinutesMatrix(addresses: string[]): Promise<number[][]> {
  const n = addresses.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(FALLBACK_TRAVEL_MINUTES));
  if (n === 0) return matrix;
  if (typeof google === "undefined" || !google.maps) return matrix;

  return new Promise((resolve) => {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: addresses,
        destinations: addresses,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status !== "OK" || !response) {
          resolve(matrix);
          return;
        }
        response.rows.forEach((row, i) => {
          row.elements.forEach((el, j) => {
            if (el.status === "OK" && el.duration) {
              matrix[i][j] = Math.ceil(el.duration.value / 60);
            }
          });
        });
        resolve(matrix);
      }
    );
  });
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// entryの時間帯が、そのドライバーのその日の稼働可能時間(最大2枠)に収まっているか判定する。
// 稼働時間が1つも設定されていなければ制限なし。
function fitsAvailability(entryStart: number, entryEnd: number, avail: DriverDayAvailability | undefined): boolean {
  if (!avail) return true;
  const windows: { start: number; end: number }[] = [];
  if (avail.startTime1 && avail.endTime1) windows.push({ start: toMinutes(avail.startTime1), end: toMinutes(avail.endTime1) });
  if (avail.startTime2 && avail.endTime2) windows.push({ start: toMinutes(avail.startTime2), end: toMinutes(avail.endTime2) });
  if (windows.length === 0) return true;
  return windows.some((w) => entryStart >= w.start && entryEnd <= w.end);
}

export interface AssignResult {
  routes: DriverRoute[];
  unassignedEntryIds: string[];
}

// entries を driverIds に割り振る。時間指定ありのものは、直前・直後の予定との間に
// Googleマップの移動時間を確保できて、かつそのドライバーの稼働可能時間内に収まる場合にのみ割り当て、
// それ以外は未回収にする。
export async function assignEntriesToDrivers(
  entries: DailyPickupEntry[],
  driverIds: string[],
  date: string,
  pickupPointsMaster: PickupPoint[],
  driverAvailability: DriverDayAvailability[] = []
): Promise<AssignResult> {
  if (driverIds.length === 0 || entries.length === 0) {
    return { routes: [], unassignedEntryIds: entries.map((e) => e.id) };
  }

  const routes: DriverRoute[] = driverIds.map((id) => ({ driverId: id, date, stops: [] }));
  const unassignedEntryIds: string[] = [];

  const addressOf = (entry: DailyPickupEntry): string =>
    pickupPointsMaster.find((p) => p.id === entry.pickupPointId)?.address ?? "";

  const timed = entries
    .filter((e) => e.timeWindowStart && e.timeWindowEnd)
    .sort((a, b) => a.timeWindowStart!.localeCompare(b.timeWindowStart!));
  const untimed = entries.filter((e) => !(e.timeWindowStart && e.timeWindowEnd));

  const addressList = Array.from(new Set(entries.map(addressOf).filter(Boolean)));
  const travelMatrix = await getTravelTimeMinutesMatrix(addressList);
  const travelMinutes = (fromAddr: string, toAddr: string): number => {
    const i = addressList.indexOf(fromAddr);
    const j = addressList.indexOf(toAddr);
    if (i === -1 || j === -1) return FALLBACK_TRAVEL_MINUTES;
    return travelMatrix[i]?.[j] ?? FALLBACK_TRAVEL_MINUTES;
  };

  timed.forEach((entry) => {
    const entryAddr = addressOf(entry);
    const entryStart = toMinutes(entry.timeWindowStart!);
    const entryEnd = toMinutes(entry.timeWindowEnd!);

    const candidates = routes.filter((route) => {
      const avail = driverAvailability.find((a) => a.driverId === route.driverId);
      if (!fitsAvailability(entryStart, entryEnd, avail)) return false;

      const routeEntries = [...route.stops]
        .sort((a, b) => a.order - b.order)
        .map((stop) => entries.find((e) => e.id === stop.entryId))
        .filter((e): e is DailyPickupEntry => !!e);

      let prev: DailyPickupEntry | undefined;
      let next: DailyPickupEntry | undefined;
      for (const other of routeEntries) {
        if (toMinutes(other.timeWindowStart!) <= entryStart) prev = other;
        else { next = other; break; }
      }

      if (prev) {
        const need = travelMinutes(addressOf(prev), entryAddr);
        if (toMinutes(prev.timeWindowEnd!) + need > entryStart) return false;
      }
      if (next) {
        const need = travelMinutes(entryAddr, addressOf(next));
        if (entryEnd + need > toMinutes(next.timeWindowStart!)) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      unassignedEntryIds.push(entry.id);
      return;
    }
    candidates.sort((a, b) => a.stops.length - b.stops.length);
    const target = candidates[0];
    target.stops.push({
      entryId: entry.id,
      order: target.stops.length + 1,
      estimatedArrival: entry.timeWindowStart,
      estimatedDuration: 15,
    });
  });

  // 時間指定なしは、少ないドライバーから均等に振り分けつつ、
  // 挿入によるルートの移動時間の増加が一番小さくなる位置(最短ルート)に差し込む
  untimed.forEach((entry) => {
    const target = [...routes].sort((a, b) => a.stops.length - b.stops.length)[0];
    const entryAddr = addressOf(entry);

    if (target.stops.length === 0) {
      target.stops.push({ entryId: entry.id, order: 1, estimatedArrival: undefined, estimatedDuration: 15 });
      return;
    }

    const sortedStops = [...target.stops].sort((a, b) => a.order - b.order);
    const stopAddrs = sortedStops.map((s) => {
      const e = entries.find((x) => x.id === s.entryId);
      return e ? addressOf(e) : "";
    });

    let bestIndex = stopAddrs.length;
    let bestExtraCost = Infinity;
    for (let i = 0; i <= stopAddrs.length; i++) {
      const prevAddr = i > 0 ? stopAddrs[i - 1] : undefined;
      const nextAddr = i < stopAddrs.length ? stopAddrs[i] : undefined;
      let extraCost = 0;
      if (prevAddr) extraCost += travelMinutes(prevAddr, entryAddr);
      if (nextAddr) extraCost += travelMinutes(entryAddr, nextAddr);
      if (prevAddr && nextAddr) extraCost -= travelMinutes(prevAddr, nextAddr);
      if (extraCost < bestExtraCost) { bestExtraCost = extraCost; bestIndex = i; }
    }

    sortedStops.splice(bestIndex, 0, { entryId: entry.id, order: 0, estimatedArrival: undefined, estimatedDuration: 15 });
    sortedStops.forEach((s, i) => { s.order = i + 1; });
    target.stops = sortedStops;
  });

  return { routes, unassignedEntryIds };
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

// GitHub Pagesで公開している経路ビューアー(docs/route.html)のURL。
// ルートデータはURLのフラグメント(#以降)にbase64url形式で埋め込むため、サーバー側の保存は不要。
const SHARE_VIEWER_BASE_URL = "https://heroes9807-ops.github.io/shukka-kanri/route.html";

function base64UrlEncode(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ドライバーに渡す共有URLを生成する。開いた先(docs/route.html)で
// 地図(Google Maps Embed API)の下に回収先・住所・指定時間・お客様名の一覧を表示し、
// ページ内の「Googleマップでナビ開始」ボタンから純正Googleマップアプリでのナビに遷移できる。
export function generateShareUrl(
  route: DriverRoute,
  driver: Driver,
  entries: DailyPickupEntry[],
  pickupPointsMaster: PickupPoint[]
): string {
  const nativeNavUrl = generateNavUrl(route, driver, entries, pickupPointsMaster);
  const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
  const stops = sortedStops
    .map((s) => {
      const entry = entries.find((e) => e.id === s.entryId);
      if (!entry) return null;
      const p = pickupPointsMaster.find((x) => x.id === entry.pickupPointId);
      if (!p) return null;
      return {
        p: p.name,
        a: p.address,
        t: entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "",
        c: entry.customerName || "",
      };
    })
    .filter((s): s is { p: string; a: string; t: string; c: string } => !!s);

  const payload = {
    d: driver.name,
    o: driver.startLocation,
    e: driver.endLocation || driver.startLocation,
    n: nativeNavUrl,
    s: stops,
  };

  return SHARE_VIEWER_BASE_URL + "#" + base64UrlEncode(JSON.stringify(payload));
}
