import { useState, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { PickupPoint, Driver, DailyPickupEntry, DailySchedule, DriverRoute, RouteStop, DriverDayAvailability, AppData } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PickupForm } from "./components/PickupForm";
import { DriverForm } from "./components/DriverForm";
import { DailyEntryForm } from "./components/DailyEntryForm";
import { AssignmentTable } from "./components/AssignmentTable";
import { Timeline } from "./components/Timeline";
import { MapView } from "./components/MapView";
import { assignEntriesToDrivers, geocodeAddress, generateShareUrl } from "./utils/routeOptimizer";
import { exportAllSchedulesToCsv } from "./utils/csvExport";
import { exportMasterData, importMasterData } from "./utils/masterDataIO";
import { loadAppData, saveAppData, createEmptyAppData } from "./utils/store";
import { UNASSIGNED_KEY } from "./utils/constants";
import "./styles/global.css";
import styles from "./App.module.css";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAPS_LIBRARIES: ("places" | "geometry")[] = [];
type Tab = "list" | "map" | "timeline";
type ModalState =
  | { type: "none" }
  | { type: "pickup"; data: PickupPoint | null }
  | { type: "driver"; data: Driver | null }
  | { type: "entry"; entryId: string };

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function addDays(dateStr: string, diff: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + diff);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function emptySchedule(date: string): DailySchedule {
  return { date, entries: [], driverIds: [], driverAvailability: [], routes: [], unassignedEntryIds: [] };
}

export default function App() {
  // 自動割り振りの移動時間計算(google.maps.DistanceMatrixService)と地図タブの両方で使うため、
  // SDKの読み込みはここ1箇所だけで行う(2箇所で呼ぶと設定の食い違いでエラーになるため)
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: API_KEY, libraries: MAPS_LIBRARIES });

  const [appData, setAppData] = useState<AppData>(createEmptyAppData());
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadAppData();
      setAppData(data);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAppData(appData);
  }, [appData, loaded]);

  const currentSchedule: DailySchedule =
    appData.schedules.find((s) => s.date === selectedDate) ?? emptySchedule(selectedDate);

  function updateSchedule(updater: (s: DailySchedule) => DailySchedule) {
    setAppData((prev) => {
      const exists = prev.schedules.some((s) => s.date === selectedDate);
      const base: DailySchedule = exists
        ? prev.schedules.find((s) => s.date === selectedDate)!
        : emptySchedule(selectedDate);
      const updated = updater(base);
      const schedules = exists
        ? prev.schedules.map((s) => (s.date === selectedDate ? updated : s))
        : [...prev.schedules, updated];
      return { ...prev, schedules };
    });
  }

  const handleSavePickupMaster = (data: { id?: string; name: string; address: string }) => {
    setAppData((prev) => {
      if (data.id) {
        return { ...prev, pickupPointsMaster: prev.pickupPointsMaster.map((p) => p.id === data.id ? { ...p, name: data.name, address: data.address } : p) };
      }
      return { ...prev, pickupPointsMaster: [...prev.pickupPointsMaster, { id: generateId(), name: data.name, address: data.address }] };
    });
    setModal({ type: "none" });
  };

  const handleDeletePickupMaster = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      pickupPointsMaster: prev.pickupPointsMaster.filter((p) => p.id !== id),
      schedules: prev.schedules.map((s) => ({
        ...s,
        entries: s.entries.filter((e) => e.pickupPointId !== id),
      })),
    }));
  };

  const handleSaveDriverMaster = (data: any) => {
    setAppData((prev) => {
      if (data.id) {
        return { ...prev, driversMaster: prev.driversMaster.map((d) => d.id === data.id ? { ...d, ...data } : d) };
      }
      return { ...prev, driversMaster: [...prev.driversMaster, { ...data, id: generateId(), endLocation: data.endLocation || data.startLocation }] };
    });
    setModal({ type: "none" });
  };

  const handleDeleteDriverMaster = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      driversMaster: prev.driversMaster.filter((d) => d.id !== id),
      schedules: prev.schedules.map((s) => ({
        ...s,
        driverIds: s.driverIds.filter((did) => did !== id),
      })),
    }));
  };

  const handleAddEntry = (pickupPointId: string) => {
    const newEntry: DailyPickupEntry = { id: generateId(), pickupPointId, timeWindowStart: "", timeWindowEnd: "", customerName: "" };
    updateSchedule((s) => ({ ...s, entries: [...s.entries, newEntry] }));
    setModal({ type: "entry", entryId: newEntry.id });
  };

  const handleDeleteEntry = (entryId: string) => {
    updateSchedule((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== entryId),
      routes: s.routes.map((r) => ({ ...r, stops: r.stops.filter((st) => st.entryId !== entryId) })),
      unassignedEntryIds: s.unassignedEntryIds.filter((id) => id !== entryId),
    }));
  };

  const handleSaveEntry = (entryId: string, data: { timeWindowStart: string; timeWindowEnd: string; customerName: string; note: string }) => {
    updateSchedule((s) => ({
      ...s,
      entries: s.entries.map((e) => e.id === entryId ? { ...e, ...data } : e),
    }));
    setModal({ type: "none" });
  };

  const handleToggleDriver = (driverId: string) => {
    updateSchedule((s) => {
      const exists = s.driverIds.includes(driverId);
      return {
        ...s,
        driverIds: exists ? s.driverIds.filter((id) => id !== driverId) : [...s.driverIds, driverId],
        driverAvailability: exists
          ? s.driverAvailability.filter((a) => a.driverId !== driverId)
          : [...s.driverAvailability, { driverId, startTime1: "", endTime1: "", startTime2: "", endTime2: "" }],
      };
    });
  };

  const handleSetDriverAvailability = (driverId: string, patch: Partial<Omit<DriverDayAvailability, "driverId">>) => {
    updateSchedule((s) => ({
      ...s,
      driverAvailability: s.driverAvailability.some((a) => a.driverId === driverId)
        ? s.driverAvailability.map((a) => a.driverId === driverId ? { ...a, ...patch } : a)
        : [...s.driverAvailability, { driverId, startTime1: "", endTime1: "", startTime2: "", endTime2: "", ...patch }],
    }));
  };

  const handleAutoAssign = async () => {
    if (currentSchedule.driverIds.length === 0 || currentSchedule.entries.length === 0) return;
    setIsAssigning(true);

    const usedPointIds = new Set(currentSchedule.entries.map((e) => e.pickupPointId));
    const geocodedMaster = await Promise.all(
      appData.pickupPointsMaster.map(async (p) => {
        if (!usedPointIds.has(p.id) || (p.lat && p.lng)) return p;
        const coords = await geocodeAddress(p.address, API_KEY);
        return coords ? { ...p, ...coords } : p;
      })
    );
    setAppData((prev) => ({ ...prev, pickupPointsMaster: geocodedMaster }));

    const result = await assignEntriesToDrivers(currentSchedule.entries, currentSchedule.driverIds, selectedDate, geocodedMaster, currentSchedule.driverAvailability);
    const routesWithNav = result.routes.map((r) => {
      const driver = appData.driversMaster.find((d) => d.id === r.driverId);
      if (!driver) return r;
      return { ...r, navUrl: generateShareUrl(r, driver, currentSchedule.entries, geocodedMaster) };
    });
    updateSchedule((s) => ({ ...s, routes: routesWithNav, unassignedEntryIds: result.unassignedEntryIds }));
    setIsAssigning(false);
    setActiveTab("list");
  };

  // fromKey/toKey は driverId、または「未回収」バケツを表す UNASSIGNED_KEY
  const handleMoveStop = (entryId: string, fromKey: string, toKey: string, toIndex: number) => {
    updateSchedule((s) => {
      const routeMap = new Map<string, string[]>();
      s.routes.forEach((r) => routeMap.set(r.driverId, [...r.stops].sort((a, b) => a.order - b.order).map((st) => st.entryId)));
      const unassigned = [...s.unassignedEntryIds];

      const getList = (key: string): string[] => {
        if (key === UNASSIGNED_KEY) return unassigned;
        if (!routeMap.has(key)) routeMap.set(key, []);
        return routeMap.get(key)!;
      };

      const fromList = getList(fromKey);
      const stopIdx = fromList.indexOf(entryId);
      if (stopIdx === -1) return s;
      fromList.splice(stopIdx, 1);

      const toList = getList(toKey);
      let insertIndex = toIndex;
      if (fromKey === toKey && stopIdx < insertIndex) insertIndex -= 1;
      insertIndex = Math.max(0, Math.min(insertIndex, toList.length));
      toList.splice(insertIndex, 0, entryId);

      const driverIdsInvolved = new Set<string>(s.routes.map((r) => r.driverId));
      if (toKey !== UNASSIGNED_KEY) driverIdsInvolved.add(toKey);

      const routes: DriverRoute[] = Array.from(driverIdsInvolved).map((driverId) => {
        const existing = s.routes.find((r) => r.driverId === driverId);
        const entryIds = routeMap.get(driverId) ?? [];
        const stops: RouteStop[] = entryIds.map((eid, i) => {
          const entry = s.entries.find((e) => e.id === eid);
          return { entryId: eid, order: i + 1, estimatedArrival: entry?.timeWindowStart, estimatedDuration: 15 };
        });
        const driver = appData.driversMaster.find((dr) => dr.id === driverId);
        const navUrl = driver ? generateShareUrl({ driverId, date: s.date, stops }, driver, s.entries, appData.pickupPointsMaster) : existing?.navUrl;
        return { driverId, date: s.date, stops, navUrl };
      });

      return { ...s, routes, unassignedEntryIds: unassigned };
    });
  };

  const handleExportMaster = () => {
    exportMasterData(appData.pickupPointsMaster, appData.driversMaster);
  };

  const handleImportMaster = async () => {
    const result = await importMasterData();
    if (!result) return;
    const ok = window.confirm(
      "読み込んだ内容(回収先" + result.pickupPointsMaster.length + "件、ドライバー" + result.driversMaster.length + "件)で、" +
      "現在の回収先・ドライバーのデータを置き換えます。よろしいですか?"
    );
    if (!ok) return;
    setAppData((prev) => ({ ...prev, pickupPointsMaster: result.pickupPointsMaster, driversMaster: result.driversMaster }));
  };

  const handleExportAllCsv = () => {
    exportAllSchedulesToCsv(appData.schedules, appData.driversMaster, appData.pickupPointsMaster);
  };

  // macOSメニューバーの「編集」からの書き出し/読み込み(開発中のみ使う機能のため画面には出さない)
  const handleExportMasterRef = useRef(handleExportMaster);
  handleExportMasterRef.current = handleExportMaster;
  const handleImportMasterRef = useRef(handleImportMaster);
  handleImportMasterRef.current = handleImportMaster;
  const handleExportAllCsvRef = useRef(handleExportAllCsv);
  handleExportAllCsvRef.current = handleExportAllCsv;

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let unlistenExport: (() => void) | undefined;
    let unlistenImport: (() => void) | undefined;
    let unlistenExportCsv: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlistenExport = await listen("export-master", () => handleExportMasterRef.current());
      unlistenImport = await listen("import-master", () => handleImportMasterRef.current());
      unlistenExportCsv = await listen("export-csv-all", () => handleExportAllCsvRef.current());
    })();
    return () => {
      unlistenExport?.();
      unlistenImport?.();
      unlistenExportCsv?.();
    };
  }, []);

  const usedDrivers = appData.driversMaster.filter((d) => currentSchedule.driverIds.includes(d.id));

  if (!loaded) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748b" }}>読み込み中...</div>;
  }

  return (
    <div className={styles.app}>
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "8px 0", background: "#f1f5f9" }}>
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>← 前の日</button>
        <span style={{ fontWeight: 600 }}>{selectedDate}</span>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>次の日 →</button>
      </div>
      <div className={styles.body}>
        <Sidebar
          pickupPointsMaster={appData.pickupPointsMaster}
          driversMaster={appData.driversMaster}
          entries={currentSchedule.entries}
          selectedDriverIds={currentSchedule.driverIds}
          driverAvailability={currentSchedule.driverAvailability}
          onAddPickup={() => setModal({ type: "pickup", data: null })}
          onAddDriver={() => setModal({ type: "driver", data: null })}
          onEditPickup={(id) => setModal({ type: "pickup", data: appData.pickupPointsMaster.find((p) => p.id === id) ?? null })}
          onEditDriver={(id) => setModal({ type: "driver", data: appData.driversMaster.find((d) => d.id === id) ?? null })}
          onDeletePickup={handleDeletePickupMaster}
          onDeleteDriver={handleDeleteDriverMaster}
          onAddPickupEntry={handleAddEntry}
          onDeleteEntry={handleDeleteEntry}
          onEditEntry={(entryId) => setModal({ type: "entry", entryId })}
          onToggleDriver={handleToggleDriver}
          onSetDriverAvailability={handleSetDriverAvailability}
        />
        <main className={styles.main}>
          <div className={styles.tabs}>
            <button className={styles.tab + (activeTab === "list" ? " " + styles.tabActive : "")} onClick={() => setActiveTab("list")}>一覧</button>
            <button className={styles.tab + (activeTab === "map" ? " " + styles.tabActive : "")} onClick={() => setActiveTab("map")}>地図</button>
            <button className={styles.tab + (activeTab === "timeline" ? " " + styles.tabActive : "")} onClick={() => setActiveTab("timeline")}>時間割</button>
            <button className={styles.assignBtn} onClick={handleAutoAssign} disabled={isAssigning || currentSchedule.driverIds.length === 0 || currentSchedule.entries.length === 0}>
              {isAssigning ? "処理中..." : "自動割り振り"}
            </button>
          </div>
          <div className={styles.content}>
            {activeTab === "list" && (
              <AssignmentTable
                drivers={usedDrivers}
                routes={currentSchedule.routes}
                entries={currentSchedule.entries}
                pickupPointsMaster={appData.pickupPointsMaster}
                unassignedEntryIds={currentSchedule.unassignedEntryIds}
                onMoveStop={handleMoveStop}
                onEditEntry={(entryId) => setModal({ type: "entry", entryId })}
              />
            )}
            {activeTab === "map" && (
              <MapView
                entries={currentSchedule.entries}
                pickupPointsMaster={appData.pickupPointsMaster}
                drivers={usedDrivers}
                routes={currentSchedule.routes}
                isLoaded={mapsLoaded}
              />
            )}
            {activeTab === "timeline" && (
              <Timeline
                drivers={usedDrivers}
                routes={currentSchedule.routes}
                entries={currentSchedule.entries}
                pickupPointsMaster={appData.pickupPointsMaster}
              />
            )}
          </div>
        </main>
      </div>
      {modal.type === "pickup" && (
        <PickupForm
          initial={modal.data}
          onSave={handleSavePickupMaster}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
      {modal.type === "driver" && (
        <DriverForm initial={modal.data} onSave={handleSaveDriverMaster} onCancel={() => setModal({ type: "none" })} />
      )}
      {modal.type === "entry" && (() => {
        const entry = currentSchedule.entries.find((e) => e.id === modal.entryId);
        const point = entry ? appData.pickupPointsMaster.find((p) => p.id === entry.pickupPointId) : undefined;
        if (!entry || !point) return null;
        return (
          <DailyEntryForm
            pickupPoint={point}
            initial={entry}
            onSave={(data) => handleSaveEntry(modal.entryId, data)}
            onCancel={() => setModal({ type: "none" })}
          />
        );
      })()}
    </div>
  );
}
