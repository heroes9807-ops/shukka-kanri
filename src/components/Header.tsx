import styles from "./Header.module.css";
export function Header({ selectedDate, onDateChange }: { selectedDate: string; onDateChange: (d: string) => void }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>集荷管理</h1>
      <div className={styles.dateControl}>
        <label className={styles.dateLabel}>日付</label>
        <input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} className={styles.dateInput} />
      </div>
    </header>
  );
}
