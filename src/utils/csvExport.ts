import type { Driver, DailySchedule, PickupPoint } from "../types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function saveCsvFile(csvContent: string, fileName: string): Promise<void> {
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

// 保存されている全ての日付分のスケジュールをまとめて1つのCSVに書き出す
export async function exportAllSchedulesToCsv(
  schedules: DailySchedule[],
  driversMaster: Driver[],
  pickupPointsMaster: PickupPoint[]
): Promise<void> {
  const rows: string[] = [];
  rows.push(["日付", "ドライバー", "順番", "回収先", "住所", "指定時間", "お客様名", "ナビURL"].join(","));

  const sortedSchedules = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  sortedSchedules.forEach((schedule) => {
    const usedDrivers = driversMaster.filter((d) => schedule.driverIds.includes(d.id));

    usedDrivers.forEach((driver) => {
      const route = schedule.routes.find((r) => r.driverId === driver.id);
      if (!route || route.stops.length === 0) return;
      const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
      sortedStops.forEach((stop) => {
        const entry = schedule.entries.find((e) => e.id === stop.entryId);
        if (!entry) return;
        const point = pickupPointsMaster.find((p) => p.id === entry.pickupPointId);
        if (!point) return;
        const timeWindow = entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "";
        const row = [schedule.date, driver.name, String(stop.order), point.name, point.address, timeWindow, entry.customerName || "", route.navUrl || ""]
          .map((v) => '"' + v.replace(/"/g, '""') + '"')
          .join(",");
        rows.push(row);
      });
    });

    schedule.unassignedEntryIds.forEach((entryId) => {
      const entry = schedule.entries.find((e) => e.id === entryId);
      if (!entry) return;
      const point = pickupPointsMaster.find((p) => p.id === entry.pickupPointId);
      if (!point) return;
      const timeWindow = entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "";
      const row = [schedule.date, "未回収", "", point.name, point.address, timeWindow, entry.customerName || "", ""]
        .map((v) => '"' + v.replace(/"/g, '""') + '"')
        .join(",");
      rows.push(row);
    });
  });

  const csvContent = "﻿" + rows.join("\n");
  await saveCsvFile(csvContent, "集荷ルート_全期間.csv");
}
