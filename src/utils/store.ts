import { Store } from "@tauri-apps/plugin-store";
import type { AppData } from "../types";

const STORE_FILE = "shukka-kanri-data.json";
const DATA_KEY = "appData";

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_FILE);
  }
  return storeInstance;
}

export function createEmptyAppData(): AppData {
  return {
    pickupPointsMaster: [],
    driversMaster: [],
    schedules: [],
  };
}

export async function loadAppData(): Promise<AppData> {
  const store = await getStore();
  const data = await store.get<AppData>(DATA_KEY);
  if (!data) {
    return createEmptyAppData();
  }
  // 過去バージョンとの整合性のため、欠けているフィールドを補完
  return {
    pickupPointsMaster: data.pickupPointsMaster ?? [],
    driversMaster: data.driversMaster ?? [],
    schedules: (data.schedules ?? []).map((s) => ({
      ...s,
      unassignedEntryIds: s.unassignedEntryIds ?? [],
      // 過去バージョン(稼働時間が1枠のみ: startTime/endTime)からの移行にも対応
      driverAvailability: (s.driverAvailability ?? []).map((a: any) => ({
        driverId: a.driverId,
        startTime1: a.startTime1 ?? a.startTime ?? "",
        endTime1: a.endTime1 ?? a.endTime ?? "",
        startTime2: a.startTime2 ?? "",
        endTime2: a.endTime2 ?? "",
      })),
    })),
  };
}

export async function saveAppData(data: AppData): Promise<void> {
  const store = await getStore();
  await store.set(DATA_KEY, data);
  await store.save();
}
