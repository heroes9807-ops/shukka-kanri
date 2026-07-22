import { useState, useEffect } from "react";
import type { DailyPickupEntry, PickupPoint } from "../types";
import styles from "./PickupForm.module.css";

interface DailyEntryFormProps {
  pickupPoint: PickupPoint;
  initial?: DailyPickupEntry | null;
  onSave: (d: { timeWindowStart: string; timeWindowEnd: string; customerName: string; note: string }) => void;
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

export function DailyEntryForm({ pickupPoint, initial, onSave, onCancel }: DailyEntryFormProps) {
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setTimeWindowStart(initial?.timeWindowStart ?? "");
    setTimeWindowEnd(initial?.timeWindowEnd ?? "");
    setCustomerName(initial?.customerName ?? "");
    setNote(initial?.note ?? "");
  }, [initial]);

  const handleSave = () => {
    onSave({ timeWindowStart, timeWindowEnd, customerName, note });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{pickupPoint.name} - 本日の詳細</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: -8, marginBottom: 12 }}>{pickupPoint.address}</p>
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
        <div className={styles.field}>
          <label className={styles.label}>備考</label>
          <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.saveBtn} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
