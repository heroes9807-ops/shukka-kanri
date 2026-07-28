import type { CSSProperties } from "react";

const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 8).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function splitTime(value: string): { h: string; m: string } {
  if (!value) return { h: "", m: "" };
  const [h, m] = value.split(":");
  return { h: h ?? "", m: m ?? "" };
}
// 変更した方の欄が「--」(未選択)になったら全体をクリアし、
// 値が入った場合はもう片方が未選択でも既定値を補って即座に時間として反映する
function nextValueOnHourChange(newHour: string, currentMinute: string): string {
  if (!newHour) return "";
  return newHour + ":" + (currentMinute || "00");
}
function nextValueOnMinuteChange(currentHour: string, newMinute: string): string {
  if (!newMinute) return "";
  return (currentHour || "08") + ":" + newMinute;
}

const defaultSelectStyle: CSSProperties = { fontSize: 12, padding: "3px 4px", borderRadius: 4, border: "1px solid #cbd5e1" };

interface TimeSelectProps {
  value: string;
  onChange: (v: string) => void;
  selectClassName?: string;
}

export function TimeSelect({ value, onChange, selectClassName }: TimeSelectProps) {
  const { h, m } = splitTime(value);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select
        className={selectClassName}
        style={selectClassName ? undefined : defaultSelectStyle}
        value={h}
        onChange={(e) => onChange(nextValueOnHourChange(e.target.value, m))}
      >
        <option value="">--</option>
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span>:</span>
      <select
        className={selectClassName}
        style={selectClassName ? undefined : defaultSelectStyle}
        value={m}
        onChange={(e) => onChange(nextValueOnMinuteChange(h, e.target.value))}
      >
        <option value="">--</option>
        {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}
