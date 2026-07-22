import type { PickupPoint, Driver, DailyPickupEntry } from "../types";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  pickupPointsMaster: PickupPoint[];
  driversMaster: Driver[];
  entries: DailyPickupEntry[];
  selectedDriverIds: string[];
  onAddPickup: () => void;
  onAddDriver: () => void;
  onEditPickup: (id: string) => void;
  onEditDriver: (id: string) => void;
  onDeletePickup: (id: string) => void;
  onDeleteDriver: (id: string) => void;
  onTogglePickup: (pickupPointId: string) => void;
  onEditEntry: (pickupPointId: string) => void;
  onToggleDriver: (id: string) => void;
}

export function Sidebar({
  pickupPointsMaster,
  driversMaster,
  entries,
  selectedDriverIds,
  onAddPickup,
  onAddDriver,
  onEditPickup,
  onEditDriver,
  onDeletePickup: _onDeletePickup,
  onDeleteDriver: _onDeleteDriver,
  onTogglePickup,
  onEditEntry,
  onToggleDriver,
}: SidebarProps) {
  const selectedPickupIds = new Set(entries.map((e) => e.pickupPointId));
  const pickupOptions = pickupPointsMaster.filter((p) => !selectedPickupIds.has(p.id));
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
          onChange={(e) => { if (e.target.value) onTogglePickup(e.target.value); }}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="">＋ 回収先を選んで追加...</option>
          {pickupOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}({p.address})</option>
          ))}
        </select>

        <ul className={styles.list}>
          {entries.length === 0 && <li className={styles.empty}>上のプルダウンから回収先を追加してください</li>}
          {entries.map((entry) => {
            const p = pickupPointsMaster.find((pt) => pt.id === entry.pickupPointId);
            if (!p) return null;
            return (
              <li key={p.id} className={styles.item} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <div className={styles.itemInfo} style={{ flex: 1 }}>
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemMeta}>{p.address}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button className={styles.iconBtn} onClick={() => onEditPickup(p.id)}>✏️</button>
                    <button className={styles.iconBtn} onClick={() => onTogglePickup(p.id)}>✕</button>
                  </div>
                </div>
                <div style={{ marginLeft: 4, marginTop: 2, fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>
                    {entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "時間未設定"}
                    {entry.customerName ? " / " + entry.customerName : ""}
                  </span>
                  <button className={styles.iconBtn} style={{ fontSize: 11 }} onClick={() => onEditEntry(p.id)}>詳細を編集</button>
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
            return (
              <li key={d.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{d.name}</span>
                  {d.vehicleType && <span className={styles.itemMeta}>{d.vehicleType}</span>}
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.iconBtn} onClick={() => onEditDriver(d.id)}>✏️</button>
                  <button className={styles.iconBtn} onClick={() => onToggleDriver(d.id)}>✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
