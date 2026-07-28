import { useState, useEffect } from "react";
import type { PickupPoint } from "../types";
import styles from "./PickupForm.module.css";

interface PickupFormProps {
  initial?: PickupPoint | null;
  onSave: (d: { id?: string; name: string; address: string }) => void;
  onCancel: () => void;
}

export function PickupForm({ initial, onSave, onCancel }: PickupFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setAddress(initial?.address ?? "");
  }, [initial]);

  const handleSave = () => {
    if (!name.trim() || !address.trim()) return;
    onSave({ id: initial?.id, name, address });
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
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.saveBtn} onClick={handleSave}>{initial ? "更新" : "追加"}</button>
        </div>
      </div>
    </div>
  );
}
