import { useState, useEffect } from "react";
import type { PickupPoint, Driver, DailyPickupEntry, DailySchedule, AppData } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PickupForm } from "./components/PickupForm";
import { DriverForm } from "./components/DriverForm";
import { DailyEntryForm } from "./components/DailyEntryForm";
import { AssignmentTable } from "./components/AssignmentTable";
import { Timeline } from "./components/Timeline";
import { MapView } from "./components/MapView";
import { assignEntriesToDrivers, geocodeAddress, generateNavUrl } from "./utils/routeOptimizer";
import { exportRoutesToCsv } from "./utils/csvExport";
import { loadAppData, saveAppData, createEmptyAppData } from "./utils/store";
import "./styles/global.css";
import styles from "./App.module.css";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
type Tab = "list" | "map" | "timeline";
type ModalState =
  | { type: "none" }
  | { type: "pickup"; data: PickupPoint | null }
  | { type: "driver"; data: Driver | null }
  | { type: "entry"; pickupPointId: string };

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function addDays(dateStr: string, diff: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + diff);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

export default function App() {
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
    appData.schedules.find((s) => s.date === selectedDate) ??
    { date: selectedDate, entries: [], driverIds: [], routes: [] };

  function updateSchedule(updater: (s: DailySchedule) => DailySchedule) {
    setAppData((prev) => {
      const exists = prev.schedules.some((s) => s.date === selectedDate);
      const base: DailySchedule = exists
        ? prev.schedules.find((s) => s.date === selectedDate)!
        : { date: selectedDate, entries: [], driverIds: [], routes: [] };
      const updated = updater(base);
      const schedules = exists
        ? prev.schedules.map((s) => (s.date === selectedDate ? updated : s))
        : [...prev.schedules, updated];
      return { ...prev, schedules };
    });
  }

  const handleSavePickupMaster = (data: { id?: string; name: string; address: string; entryUpdate?: { timeWindowStart: string; timeWindowEnd: string; customerName: string } }) => {
    setAppData((prev) => {
      if (data.id) {
        return { ...prev, pickupPointsMaster: prev.pickupPointsMaster.map((p) => p.id === data.id ? { ...p, name: data.name, address: data.address } : p) };
      }
      return { ...prev, pickupPointsMaster: [...prev.pickupPointsMaster, { id: generateId(), name: data.name, address: data.address }] };
    });
    if (data.id && data.entryUpdate) {
      const pickupPointId = data.id;
      const upd = data.entryUpdate;
      updateSchedule((s) => ({
        ...s,
        entries: s.entries.map((e) => e.pickupPointId === pickupPointId ? { ...e, ...upd } : e),
      }));
    }
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

  const handleTogglePickup = (pickupPointId: string) => {
    const exists = currentSchedule.entries.some((e) => e.pickupPointId === pickupPointId);
    if (exists) {
      updateSchedule((s) => ({ ...s, entries: s.entries.filter((e) => e.pickupPointId !== pickupPointId) }));
    } else {
      const newEntry: DailyPickupEntry = { id: generateId(), pickupPointId, timeWindowStart: "", timeWindowEnd: "", customerName: "" };
      updateSchedule((s) => ({ ...s, entries: [...s.entries, newEntry] }));
      setModal({ type: "entry", pickupPointId });
    }
  };

  const handleSaveEntry = (pickupPointId: string, data: { timeWindowStart: string; timeWindowEnd: string; customerName: string; note: string }) => {
    updateSchedule((s) => ({
      ...s,
      entries: s.entries.map((e) => e.pickupPointId === pickupPointId ? { ...e, ...data } : e),
    }));
    setModal({ type: "none" });
  };

  const handleToggleDriver = (driverId: string) => {
    updateSchedule((s) => {
      const exists = s.driverIds.includes(driverId);
      return { ...s, driverIds: exists ? s.driverIds.filter((id) => id !== driverId) : [...s.driverIds, driverId] };
    });
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

    const newRoutes = assignEntriesToDrivers(currentSchedule.entries, currentSchedule.driverIds, selectedDate);
    const routesWithNav = newRoutes.map((r) => {
      const driver = appData.driversMaster.find((d) => d.id === r.driverId);
      if (!driver) return r;
      return { ...r, navUrl: generateNavUrl(r, driver, currentSchedule.entries, geocodedMaster) };
    });
    updateSchedule((s) => ({ ...s, routes: routesWithNav }));
    setIsAssigning(false);
    setActiveTab("list");
  };

  const handleExportCsv = () => {
    const usedDrivers = appData.driversMaster.filter((d) => currentSchedule.driverIds.includes(d.id));
    exportRoutesToCsv(usedDrivers, currentSchedule.routes, currentSchedule.entries, appData.pickupPointsMaster, selectedDate);
  };

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
          onAddPickup={() => setModal({ type: "pickup", data: null })}
          onAddDriver={() => setModal({ type: "driver", data: null })}
          onEditPickup={(id) => setModal({ type: "pickup", data: appData.pickupPointsMaster.find((p) => p.id === id) ?? null })}
          onEditDriver={(id) => setModal({ type: "driver", data: appData.driversMaster.find((d) => d.id === id) ?? null })}
          onDeletePickup={handleDeletePickupMaster}
          onDeleteDriver={handleDeleteDriverMaster}
          onTogglePickup={handleTogglePickup}
          onEditEntry={(pickupPointId) => setModal({ type: "entry", pickupPointId })}
          onToggleDriver={handleToggleDriver}
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
                onExportCsv={handleExportCsv}
              />
            )}
            {activeTab === "map" && (
              <MapView
                entries={currentSchedule.entries}
                pickupPointsMaster={appData.pickupPointsMaster}
                drivers={usedDrivers}
                routes={currentSchedule.routes}
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
          entry={modal.data ? currentSchedule.entries.find((e) => e.pickupPointId === modal.data!.id) ?? null : null}
          onSave={handleSavePickupMaster}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
      {modal.type === "driver" && (
        <DriverForm initial={modal.data} onSave={handleSaveDriverMaster} onCancel={() => setModal({ type: "none" })} />
      )}
      {modal.type === "entry" && (() => {
        const point = appData.pickupPointsMaster.find((p) => p.id === modal.pickupPointId);
        const entry = currentSchedule.entries.find((e) => e.pickupPointId === modal.pickupPointId);
        if (!point) return null;
        return (
          <DailyEntryForm
            pickupPoint={point}
            initial={entry ?? null}
            onSave={(data) => handleSaveEntry(modal.pickupPointId, data)}
            onCancel={() => setModal({ type: "none" })}
          />
        );
      })()}
    </div>
  );
}
