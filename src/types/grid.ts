/**
 * 單一停車格的假資料結構（純前端 State 使用，不連接資料庫）
 */
export interface SpotData {
  id: string;
  status: 'available' | 'occupied' | 'disabled' | 'mine';
  number: string;
}

/**
 * 停車陣列的定義
 * - rows / cols：陣列的行列數
 * - spots：陣列的格子列表
 * - isLive：若為 true，表示此陣列連接 Supabase 真實資料；若為 false，使用本地 State 假資料
 */
export interface ParkingArray {
  id: string;
  name: string;
  rows: number;
  cols: number;
  spots: SpotData[];
  isLive?: boolean;
  dbTable?: 'parking_spots' | 'car_parking_spots';
  arrayType?: 'car' | 'motorcycle';
}

/**
 * 透過 Outlet context 傳遞給子頁面的資料結構
 */
export interface GridContext {
  arrays: ParkingArray[];
  activeArrayId: string;
  setActiveArrayId: (id: string) => void;
  addArray: (name: string, rows: number, cols: number, dbTable: 'parking_spots' | 'car_parking_spots') => void;
  updateArray: (id: string, updates: Partial<ParkingArray>) => void;
  deleteArray: (id: string) => void;
}

/**
 * Supabase 資料庫中的車位結構定義
 */
export interface DbSpot {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'mine' | 'disabled';
  occupied_by: string | null;
  occupied_at: string | null;
  created_at?: string;
  row_index?: number;
  col_index?: number;
}

