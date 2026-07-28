import type { PickupPoint, Driver, DailyPickupEntry, DriverDayAvailability } from "../types";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  pickupPointsMaster: PickupPoint[];
  driversMaster: Driver[];
  entries: DailyPickupEntry[];
  selectedDriverIds: string[];
  driverAvailability: DriverDayAvailability[];
  onAddPickup: () => void;
  onAddDriver: () => void;
  onEditPickup: (id: string) => void;
  onEditDriver: (id: string) => void;
  onDeletePickup: (id: string) => void;
  onDeleteDriver: (id: string) => void;
  onAddPickupEntry: (pickupPointId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onEditEntry: (entryId: string) => void;
  onToggleDriver: (id: string) => void;
  onSetDriverAvailability: (driverId: string, patch: Partial<Omit<DriverDayAvailability, "driverId">>) => void;
}

export function Sidebar({
  pickupPointsMaster,
  driversMaster,
  entries,
  selectedDriverIds,
  driverAvailability,
  onAddPickup,
  onAddDriver,
  onEditPickup,
  onEditDriver,
  onDeletePickup: _onDeletePickup,
  onDeleteDriver: _onDeleteDriver,
  onAddPickupEntry,
  onDeleteEntry,
  onEditEntry,
  onToggleDriver,
  onSetDriverAvailability,
}: SidebarProps) {
  const driverOptions = driversMaster.filter((d) => !selectedDriverIds.includes(d.id));

  return (
    <aside className={styles.sidebar}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>回収先(本日選択中)</h2>
          <button className={styles.addBtn} onClick={onAddPickup}>＋ 新規登録</button>
        </div>

        <select
          className={styles.input}
          value=""
          onChange={(e) => { if (e.target.value) onAddPickupEntry(e.target.value); }}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="">＋ 回収先を選んで追加...</option>
          {pickupPointsMaster.map((p) => (
            <option key={p.id} value={p.id}>{p.name}({p.address})</option>
          ))}
        </select>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "-4px 0 8px" }}>同じ回収先でも、別の時間帯なら重ねて追加できます</p>

        <ul className={styles.list}>
          {entries.length === 0 && <li className={styles.empty}>上のプルダウンから回収先を追加してください</li>}
          {entries.map((entry) => {
            const p = pickupPointsMaster.find((pt) => pt.id === entry.pickupPointId);
            if (!p) return null;
            return (
              <li key={entry.id} className={styles.item} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <div className={styles.itemInfo} style={{ flex: 1 }}>
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemMeta}>{p.address}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button className={styles.iconBtn} onClick={() => onEditPickup(p.id)}>✏️</button>
                    <button className={styles.iconBtn} onClick={() => onDeleteEntry(entry.id)}>✕</button>
                  </div>
                </div>
                <div style={{ marginLeft: 4, marginTop: 2, fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>
                    {entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "時間未設定"}
                    {entry.customerName ? " / " + entry.customerName : ""}
                  </span>
                  <button className={styles.iconBtn} style={{ fontSize: 11 }} onClick={() => onEditEntry(entry.id)}>詳細を編集</button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ドライバー(本日選択中)</h2>
          <button className={styles.addBtn} onClick={onAddDriver}>＋ 新規登録</button>
        </div>

        <select
          className={styles.input}
          value=""
          onChange={(e) => { if (e.target.value) onToggleDriver(e.target.value); }}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="">＋ ドライバーを選んで追加...</option>
          {driverOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}{d.vehicleType ? "(" + d.vehicleType + ")" : ""}</option>
          ))}
        </select>

        <ul className={styles.list}>
          {selectedDriverIds.length === 0 && <li className={styles.empty}>上のプルダウンからドライバーを追加してください</li>}
          {selectedDriverIds.map((id) => {
            const d = driversMaster.find((dr) => dr.id === id);
            if (!d) return null;
            const avail = driverAvailability.find((a) => a.driverId === id);
            return (
              <li key={d.id} className={styles.item} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <div className={styles.itemInfo} style={{ flex: 1 }}>
                    <span className={styles.itemName}>{d.name}</span>
                    {d.vehicleType && <span className={styles.itemMeta}>{d.vehicleType}</span>}
                  </div>
                  <div className={styles.itemActions}>
                    <button className={styles.iconBtn} onClick={() => onEditDriver(d.id)}>✏️</button>
                    <button className={styles.iconBtn} onClick={() => onToggleDriver(d.id)}>✕</button>
                  </div>
                </div>
                <div style={{ marginLeft: 4, marginTop: 2, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}>
                  <span style={{ flexShrink: 0 }}>稼働1:</span>
                  <input
                    type="time"
                    value={avail?.startTime1 ?? ""}
                    onChange={(e) => onSetDriverAvailability(d.id, { startTime1: e.target.value })}
                    style={{ fontSize: 11, padding: "1px 2px", borderRadius: 4, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", width: 82, colorScheme: "dark" }}
                  />
                  <span style={{ flexShrink: 0 }}>〜</span>
                  <input
                    type="time"
                    value={avail?.endTime1 ?? ""}
                    onChange={(e) => onSetDriverAvailability(d.id, { endTime1: e.target.value })}
                    style={{ fontSize: 11, padding: "1px 2px", borderRadius: 4, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", width: 82, colorScheme: "dark" }}
                  />
                </div>
                <div style={{ marginLeft: 4, marginTop: 2, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}>
                  <span style={{ flexShrink: 0 }}>稼働2:</span>
                  <input
                    type="time"
                    value={avail?.startTime2 ?? ""}
                    onChange={(e) => onSetDriverAvailability(d.id, { startTime2: e.target.value })}
                    style={{ fontSize: 11, padding: "1px 2px", borderRadius: 4, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", width: 82, colorScheme: "dark" }}
                  />
                  <span style={{ flexShrink: 0 }}>〜</span>
                  <input
                    type="time"
                    value={avail?.endTime2 ?? ""}
                    onChange={(e) => onSetDriverAvailability(d.id, { endTime2: e.target.value })}
                    style={{ fontSize: 11, padding: "1px 2px", borderRadius: 4, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", width: 82, colorScheme: "dark" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
