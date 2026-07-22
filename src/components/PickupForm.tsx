import { useState, useEffect } from "react";
import type { PickupPoint, DailyPickupEntry } from "../types";
import styles from "./PickupForm.module.css";

interface PickupFormProps {
  initial?: PickupPoint | null;
  entry?: DailyPickupEntry | null;
  onSave: (d: { id?: string; name: string; address: string; entryUpdate?: { timeWindowStart: string; timeWindowEnd: string; customerName: string } }) => void;
  onCancel: () => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 8).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function splitTime(value: string): { h: string; m: string } {
  if (!value) return { h: "", m: "" };
  const [h, m] = value.split(":");
  return { h: h ?? "", m: m ?? "" };
}
function joinTime(h: string, m: string): string {
  if (!h && !m) return "";
  return (h || "08") + ":" + (m || "00");
}
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { h, m } = splitTime(value);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select className={styles.input} value={h} onChange={(e) => onChange(joinTime(e.target.value, m))}>
        <option value="">--</option>
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span>:</span>
      <select className={styles.input} value={m} onChange={(e) => onChange(joinTime(h, e.target.value))}>
        <option value="">--</option>
        {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

export function PickupForm({ initial, entry, onSave, onCancel }: PickupFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setAddress(initial?.address ?? "");
    setTimeWindowStart(entry?.timeWindowStart ?? "");
    setTimeWindowEnd(entry?.timeWindowEnd ?? "");
    setCustomerName(entry?.customerName ?? "");
  }, [initial, entry]);

  const handleSave = () => {
    if (!name.trim() || !address.trim()) return;
    onSave({
      id: initial?.id,
      name,
      address,
      entryUpdate: entry ? { timeWindowStart, timeWindowEnd, customerName } : undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{initial ? "回収先を編集" : "回収先を追加"}</h2>
        <div className={styles.field}>
          <label className={styles.label}>回収先名 *</label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ○○商店" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>住所 *</label>
          <input className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="例: 東京都新宿区1-1-1" />
        </div>
        {entry && (
          <>
            <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 4px" }}>本日の情報</p>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>開始時間</label>
                <TimeSelect value={timeWindowStart} onChange={setTimeWindowStart} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>終了時間</label>
                <TimeSelect value={timeWindowEnd} onChange={setTimeWindowEnd} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>お客様名</label>
              <input className={styles.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="例: 山田太郎様" />
            </div>
          </>
        )}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.saveBtn} onClick={handleSave}>{initial ? "更新" : "追加"}</button>
        </div>
      </div>
    </div>
  );
}
