import type { Driver, DriverRoute, PickupPoint, DailyPickupEntry } from "../types";

function buildCsvContent(
  drivers: Driver[],
  routes: DriverRoute[],
  entries: DailyPickupEntry[],
  pickupPointsMaster: PickupPoint[]
): string {
  const rows: string[] = [];
  rows.push(["ドライバー", "順番", "回収先", "住所", "指定時間", "お客様名", "ナビURL"].join(","));

  drivers.forEach((driver) => {
    const route = routes.find((r) => r.driverId === driver.id);
    if (!route || route.stops.length === 0) return;
    const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
    sortedStops.forEach((stop) => {
      const entry = entries.find((e) => e.id === stop.entryId);
      if (!entry) return;
      const point = pickupPointsMaster.find((p) => p.id === entry.pickupPointId);
      if (!point) return;
      const timeWindow = entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "";
      const row = [driver.name, String(stop.order), point.name, point.address, timeWindow, entry.customerName || "", route.navUrl || ""]
        .map((v) => '"' + v.replace(/"/g, '""') + '"')
        .join(",");
      rows.push(row);
    });
  });

  return "\uFEFF" + rows.join("\n");
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function exportRoutesToCsv(
  drivers: Driver[],
  routes: DriverRoute[],
  entries: DailyPickupEntry[],
  pickupPointsMaster: PickupPoint[],
  date: string
): Promise<void> {
  const csvContent = buildCsvContent(drivers, routes, entries, pickupPointsMaster);
  const fileName = "集荷ルート_" + date + ".csv";

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (filePath) {
      await writeTextFile(filePath, csvContent);
    }
    return;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
