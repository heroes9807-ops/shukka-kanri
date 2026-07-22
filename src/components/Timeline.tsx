import type { Driver, DriverRoute, PickupPoint, DailyPickupEntry } from "../types";
import styles from "./Timeline.module.css";
const C = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];
const H = Array.from({ length: 13 }, (_, i) => i + 7);
function tp(t: string) { const [h, m] = t.split(":").map(Number); return ((h * 60 + m - 420) / 720) * 100; }

interface TimelineProps {
  drivers: Driver[];
  routes: DriverRoute[];
  entries: DailyPickupEntry[];
  pickupPointsMaster: PickupPoint[];
}

export function Timeline({ drivers, routes, entries, pickupPointsMaster }: TimelineProps) {
  if (drivers.length === 0 || routes.length === 0) return <div className={styles.empty}><p>割り振り後にタイムラインが表示されます。</p></div>;
  return (
    <div className={styles.container}>
      <div className={styles.timeHeader}>
        <div className={styles.lbl} />
        <div className={styles.timeBar}>{H.map((h) => <span key={h} className={styles.timeMarker} style={{ left: tp(h + ":00") + "%" }}>{h}:00</span>)}</div>
      </div>
      {drivers.map((d, i) => {
        const r = routes.find((x) => x.driverId === d.id);
        const c = C[i % C.length];
        return (
          <div key={d.id} className={styles.row}>
            <div className={styles.lbl}><span className={styles.dot} style={{ background: c }} />{d.name}</div>
            <div className={styles.timeBar}>
              {H.map((h) => <div key={h} className={styles.gridLine} style={{ left: tp(h + ":00") + "%" }} />)}
              {r?.stops.map((stop) => {
                if (!stop.estimatedArrival) return null;
                const entry = entries.find((e) => e.id === stop.entryId);
                const p = entry ? pickupPointsMaster.find((x) => x.id === entry.pickupPointId) : undefined;
                return <div key={stop.entryId} className={styles.block} style={{ left: tp(stop.estimatedArrival) + "%", width: Math.max(((stop.estimatedDuration ?? 15) / 720) * 100, 2) + "%", background: c }} title={p?.name}><span className={styles.blockLabel}>{p?.name}</span></div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
