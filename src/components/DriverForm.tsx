import { useState, useEffect } from "react";
import type { Driver } from "../types";
import styles from "./DriverForm.module.css";
const E = { name: "", vehicleType: "", startLocation: "", endLocation: "" };
export function DriverForm({ initial, onSave, onCancel }: { initial?: Driver | null; onSave: (d: any) => void; onCancel: () => void }) {
  const [f, setF] = useState<any>(initial ?? E);
  useEffect(() => { setF(initial ?? E); }, [initial]);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{initial ? "ドライバーを編集" : "ドライバーを追加"}</h2>
        <div className={styles.field}><label className={styles.label}>名前</label><input className={styles.input} value={f.name} onChange={(e) => s("name", e.target.value)} placeholder="例: 田中太郎" /></div>
        <div className={styles.field}><label className={styles.label}>車種</label><input className={styles.input} value={f.vehicleType} onChange={(e) => s("vehicleType", e.target.value)} placeholder="例: ハイエース" /></div>
        <div className={styles.field}><label className={styles.label}>出発地</label><input className={styles.input} value={f.startLocation} onChange={(e) => s("startLocation", e.target.value)} placeholder="例: 札幌市北区" /></div>
        <div className={styles.field}><label className={styles.label}>帰着地</label><input className={styles.input} value={f.endLocation} onChange={(e) => s("endLocation", e.target.value)} placeholder="空欄=出発地と同じ" /></div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.saveBtn} onClick={() => { if (f.name && f.startLocation) onSave(f); }}>{initial ? "更新" : "追加"}</button>
        </div>
      </div>
    </div>
  );
}
