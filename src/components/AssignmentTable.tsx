import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Driver, DriverRoute, PickupPoint, DailyPickupEntry } from "../types";
import { UNASSIGNED_KEY } from "../utils/constants";
import styles from "./AssignmentTable.module.css";
const C = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

interface AssignmentTableProps {
  drivers: Driver[];
  routes: DriverRoute[];
  entries: DailyPickupEntry[];
  pickupPointsMaster: PickupPoint[];
  unassignedEntryIds: string[];
  onMoveStop: (entryId: string, fromKey: string, toKey: string, toIndex: number) => void;
  onEditEntry: (entryId: string) => void;
}

function parseDropKey(key: string): { targetKey: string; toIndex: number } | null {
  const sep = key.lastIndexOf(":");
  if (sep === -1) return null;
  const targetKey = key.slice(0, sep);
  const rest = key.slice(sep + 1);
  if (rest === "end") return { targetKey, toIndex: Number.MAX_SAFE_INTEGER };
  const toIndex = Number(rest);
  if (Number.isNaN(toIndex)) return null;
  return { targetKey, toIndex };
}

export function AssignmentTable({ drivers, routes, entries, pickupPointsMaster, unassignedEntryIds, onMoveStop, onEditEntry }: AssignmentTableProps) {
  const [qrDriverId, setQrDriverId] = useState<string | null>(null);
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ entryId: string; fromKey: string } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;

  useEffect(() => {
    if (!dragging) return;

    const dropKeyAt = (clientX: number, clientY: number): string | null => {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const target = el?.closest("[data-drop-key]") as HTMLElement | null;
      return target?.getAttribute("data-drop-key") ?? null;
    };

    const handleMove = (e: MouseEvent) => {
      setDragOverKey(dropKeyAt(e.clientX, e.clientY));
    };

    const handleUp = (e: MouseEvent) => {
      const key = dropKeyAt(e.clientX, e.clientY);
      const current = draggingRef.current;
      if (key && current) {
        const parsed = parseDropKey(key);
        if (parsed) onMoveStop(current.entryId, current.fromKey, parsed.targetKey, parsed.toIndex);
      }
      setDragging(null);
      setDragOverKey(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, onMoveStop]);

  const handleCopyUrl = (driverId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedDriverId(driverId);
    setTimeout(() => setCopiedDriverId(null), 2000);
  };

  if (drivers.length === 0) return (
    <div className={styles.empty}>
      <p>サイドバーから回収先とドライバーを選択してください。</p>
      <p>選択後、自動割り振りで最適ルートを生成します。</p>
    </div>
  );

  const unassignedEndKey = UNASSIGNED_KEY + ":end";

  return (
    <div className={styles.container}>
      {drivers.map((d, i) => {
        const r = routes.find((x) => x.driverId === d.id);
        const c = C[i % C.length];
        const sortedStops = [...(r?.stops ?? [])].sort((a, b) => a.order - b.order);
        const endKey = d.id + ":end";
        return (
          <div key={d.id} className={styles.driverBlock}>
            <div className={styles.driverHeader} style={{ display: "flex", alignItems: "center" }}>
              <span className={styles.dot} style={{ background: c }} />
              <h3 className={styles.driverName}>{d.name}</h3>
              {r?.navUrl && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <a href={r.navUrl} target="_blank" rel="noopener noreferrer">
                    <button>スマホのGoogleマップでナビ開始</button>
                  </a>
                  <button onClick={() => handleCopyUrl(d.id, r.navUrl!)}>
                    {copiedDriverId === d.id ? "コピー済み" : "URLコピー"}
                  </button>
                  <button onClick={() => setQrDriverId(qrDriverId === d.id ? null : d.id)}>
                    {qrDriverId === d.id ? "QRを閉じる" : "QR表示"}
                  </button>
                </div>
              )}
            </div>
            {qrDriverId === d.id && r?.navUrl && (
              <div style={{ padding: 16 }}>
                <QRCodeSVG value={r.navUrl} size={160} />
              </div>
            )}
            {sortedStops.length === 0 ? <p className={styles.noStops}>割り振りなし</p> : (
              <table className={styles.table}>
                <thead><tr><th></th><th>#</th><th>回収先</th><th>住所</th><th>指定時間</th><th>お客様名</th><th></th></tr></thead>
                <tbody>
                  {sortedStops.map((stop, idx) => {
                    const entry = entries.find((e) => e.id === stop.entryId);
                    if (!entry) return null;
                    const p = pickupPointsMaster.find((x) => x.id === entry.pickupPointId);
                    if (!p) return null;
                    const rowKey = d.id + ":" + idx;
                    return (
                      <tr
                        key={stop.entryId}
                        data-drop-key={rowKey}
                        className={
                          (dragging?.entryId === stop.entryId ? styles.dragging + " " : "") +
                          (dragOverKey === rowKey ? styles.dragOver : "")
                        }
                      >
                        <td
                          className={styles.dragHandle}
                          onMouseDown={(e) => { e.preventDefault(); setDragging({ entryId: stop.entryId, fromKey: d.id }); }}
                        >
                          ⠿
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: c }}>{stop.order}</td>
                        <td>{p.name}</td>
                        <td style={{ fontSize: 13, color: "#64748b" }}>{p.address}</td>
                        <td>{entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "—"}</td>
                        <td>{entry.customerName || "—"}</td>
                        <td><button className={styles.editBtn} onClick={() => onEditEntry(entry.id)}>時間を編集</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div
              data-drop-key={endKey}
              className={styles.dropEnd + (dragOverKey === endKey ? " " + styles.dragOver : "")}
            >
              {dragging ? "ここにドロップして" + d.name + "の最後に追加" : ""}
            </div>
          </div>
        );
      })}

      {routes.length > 0 && (
        <div className={styles.unassignedBlock}>
          <div className={styles.driverHeader} style={{ display: "flex", alignItems: "center" }}>
            <span className={styles.warnDot} />
            <h3 className={styles.driverName}>未回収{unassignedEntryIds.length > 0 ? "(" + unassignedEntryIds.length + "件)" : ""}</h3>
          </div>
          {unassignedEntryIds.length === 0 ? (
            <p className={styles.noStops}>未回収の回収先はありません</p>
          ) : (
            <table className={styles.table}>
              <thead><tr><th></th><th>回収先</th><th>住所</th><th>指定時間</th><th>お客様名</th><th></th></tr></thead>
              <tbody>
                {unassignedEntryIds.map((entryId, idx) => {
                  const entry = entries.find((e) => e.id === entryId);
                  if (!entry) return null;
                  const p = pickupPointsMaster.find((x) => x.id === entry.pickupPointId);
                  if (!p) return null;
                  const rowKey = UNASSIGNED_KEY + ":" + idx;
                  return (
                    <tr
                      key={entryId}
                      data-drop-key={rowKey}
                      className={
                        (dragging?.entryId === entryId ? styles.dragging + " " : "") +
                        (dragOverKey === rowKey ? styles.dragOver : "")
                      }
                    >
                      <td
                        className={styles.dragHandle}
                        onMouseDown={(e) => { e.preventDefault(); setDragging({ entryId, fromKey: UNASSIGNED_KEY }); }}
                      >
                        ⠿
                      </td>
                      <td>{p.name}</td>
                      <td style={{ fontSize: 13, color: "#64748b" }}>{p.address}</td>
                      <td style={{ color: "#b45309", fontWeight: 600 }}>{entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "—"}</td>
                      <td>{entry.customerName || "—"}</td>
                      <td><button className={styles.editBtn} onClick={() => onEditEntry(entry.id)}>時間を編集</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div
            data-drop-key={unassignedEndKey}
            className={styles.dropEnd + (dragOverKey === unassignedEndKey ? " " + styles.dragOver : "")}
          >
            {dragging ? "ここにドロップして未回収に移動" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
