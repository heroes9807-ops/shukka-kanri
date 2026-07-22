// ============================================
// 回収先マスタ(一覧から選べる、住所・名前のみ)
// ============================================
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

// ============================================
// ドライバーマスタ(一覧から選べる)
// ============================================
export interface Driver {
  id: string;
  name: string;
  vehicleType?: string;
  startLocation: string;
  endLocation: string;
}

// ============================================
// 日別の回収予定(その日固有の指定時間・お客様名を持つ)
// ============================================
export interface DailyPickupEntry {
  id: string;                 // このエントリー自体の一意ID
  pickupPointId: string;      // PickupPoint(マスタ)への参照
  timeWindowStart?: string;   // その日の開始時間 "HH:mm"
  timeWindowEnd?: string;     // その日の終了時間 "HH:mm"
  customerName?: string;      // お客様名(旧・荷物量から変更)
  note?: string;
}

// ============================================
// ルート関連
// ============================================
export interface RouteStop {
  entryId: string;            // DailyPickupEntry.id への参照
  order: number;
  estimatedArrival?: string;
  estimatedDuration?: number;
}

export interface DriverRoute {
  driverId: string;
  date: string;
  stops: RouteStop[];
  totalDistanceKm?: number;
  totalDurationMin?: number;
  navUrl?: string;
}

// ============================================
// 日付ごとのスケジュール(その日のエントリー・ドライバー・ルートをまとめる)
// ============================================
export interface DailySchedule {
  date: string;                // "YYYY-MM-DD"
  entries: DailyPickupEntry[];
  driverIds: string[];         // その日使用するドライバーのID一覧
  routes: DriverRoute[];
}

// ============================================
// アプリ全体で保存するデータ(Storeに保存する単位)
// ============================================
export interface AppData {
  pickupPointsMaster: PickupPoint[];
  driversMaster: Driver[];
  schedules: DailySchedule[];  // 日付ごとの記録一覧
}
