import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Driver, DriverRoute, PickupPoint, DailyPickupEntry } from "../types";
import styles from "./AssignmentTable.module.css";
const C = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

interface AssignmentTableProps {
  drivers: Driver[];
  routes: DriverRoute[];
  entries: DailyPickupEntry[];
  pickupPointsMaster: PickupPoint[];
  onExportCsv: () => void;
}

export function AssignmentTable({ drivers, routes, entries, pickupPointsMaster, onExportCsv }: AssignmentTableProps) {
  const [qrDriverId, setQrDriverId] = useState<string | null>(null);
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);

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

  return (
    <div className={styles.container}>
      {routes.length > 0 && (
        <div style={{ marginBottom: 16, textAlign: "right" }}>
          <button
            onClick={onExportCsv}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            CSVダウンロード
          </button>
        </div>
      )}
      {drivers.map((d, i) => {
        const r = routes.find((x) => x.driverId === d.id);
        const c = C[i % C.length];
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
            {!r || r.stops.length === 0 ? <p className={styles.noStops}>割り振りなし</p> : (
              <table className={styles.table}>
                <thead><tr><th>#</th><th>回収先</th><th>住所</th><th>指定時間</th><th>お客様名</th></tr></thead>
                <tbody>
                  {r.stops.map((stop) => {
                    const entry = entries.find((e) => e.id === stop.entryId);
                    if (!entry) return null;
                    const p = pickupPointsMaster.find((x) => x.id === entry.pickupPointId);
                    if (!p) return null;
                    return (
                      <tr key={stop.entryId}>
                        <td style={{ textAlign: "center", fontWeight: 700, color: c }}>{stop.order}</td>
                        <td>{p.name}</td>
                        <td style={{ fontSize: 13, color: "#64748b" }}>{p.address}</td>
                        <td>{entry.timeWindowStart ? entry.timeWindowStart + "〜" + entry.timeWindowEnd : "—"}</td>
                        <td>{entry.customerName || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
