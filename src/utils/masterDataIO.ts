import type { PickupPoint, Driver } from "../types";

export interface MasterData {
  pickupPointsMaster: PickupPoint[];
  driversMaster: Driver[];
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function exportMasterData(pickupPointsMaster: PickupPoint[], driversMaster: Driver[]): Promise<void> {
  const data: MasterData = { pickupPointsMaster, driversMaster };
  const jsonContent = JSON.stringify(data, null, 2);
  const fileName = "回収先とドライバー.json";

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (filePath) {
      await writeTextFile(filePath, jsonContent);
    }
    return;
  }

  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function parseMasterData(content: string): MasterData | null {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data.pickupPointsMaster) || !Array.isArray(data.driversMaster)) return null;
    return { pickupPointsMaster: data.pickupPointsMaster, driversMaster: data.driversMaster };
  } catch {
    return null;
  }
}

export async function importMasterData(): Promise<MasterData | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath || Array.isArray(filePath)) return null;
    const content = await readTextFile(filePath);
    return parseMasterData(content);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const content = await file.text();
      resolve(parseMasterData(content));
    };
    input.click();
  });
}
