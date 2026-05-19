import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SpotManager from './pages/SpotManager';
import UserManager from './pages/UserManager';
import GridConfig from './pages/GridConfig';
import Layout from './components/Layout';
import type { ParkingArray, GridContext } from './types/grid';
import './index.css';

/** 預設的第一筆陣列（主停車場）— 標記 isLive=true，GridConfig 會從 Supabase 拉取真實資料 */
const DEFAULT_ARRAY: ParkingArray = {
  id: 'array-default',
  name: '主停車場',
  rows: 25,
  cols: 23,
  spots: [], // NOTE: 留空，GridConfig 掛載後從 Supabase fetch 填入
  isLive: true,
};

export default function App() {
  const [arrays, setArrays] = useState<ParkingArray[]>([DEFAULT_ARRAY]);
  const [activeArrayId, setActiveArrayId] = useState<string>(DEFAULT_ARRAY.id);

  /**
   * 新增陣列：由 Modal 傳入名稱與初始行列數，全部空位讓使用者從頭手動配置
   */
  const addArray = (name: string, rows: number, cols: number) => {
    const id = `array-${Date.now()}`;
    // NOTE: 新陣列全空白，不帶假資料，讓管理員從頭配置
    const blankSpots = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (__, c) => ({
        id: `${id}-${r}-${c}`,
        number: `${String.fromCharCode(65 + r)}-${String(c + 1).padStart(2, '0')}`,
        status: 'available' as const,
      }))
    ).flat();
    const newArray: ParkingArray = { id, name, rows, cols, spots: blankSpots };
    setArrays(prev => [...prev, newArray]);
    setActiveArrayId(id);
  };


  /**
   * 更新指定陣列的部分欄位（例如調整行列數後重新產生 spots）
   */
  const updateArray = (id: string, updates: Partial<ParkingArray>) => {
    setArrays(prev =>
      prev.map(arr => (arr.id === id ? { ...arr, ...updates } : arr))
    );
  };

  const context: GridContext = {
    arrays,
    activeArrayId,
    setActiveArrayId,
    addArray,
    updateArray,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout context={context} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/spots" element={<SpotManager />} />
          <Route path="/users" element={<UserManager />} />
          <Route path="/grid" element={<GridConfig context={context} />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
