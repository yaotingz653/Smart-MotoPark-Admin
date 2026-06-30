import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SpotManager from './pages/SpotManager';
import UserManager from './pages/UserManager';
import GridConfig from './pages/GridConfig';
import CommunityManager from './pages/CommunityManager';
import Layout from './components/Layout';
import type { ParkingArray, GridContext } from './types/grid';
import { supabase } from './lib/supabase';
import './index.css';

/** 預設的第一筆陣列（主停車場）— 標記 isLive=true，GridConfig 會從 Supabase 拉取真實資料 */
const DEFAULT_ARRAY: ParkingArray = {
  id: 'array-default',
  name: '主停車場',
  rows: 25,
  cols: 23,
  spots: [], // NOTE: 留空，GridConfig 掛載後從 Supabase fetch 填入
  isLive: true,
  dbTable: 'parking_spots',
  arrayType: 'motorcycle',
};

export default function App() {
  const [arrays, setArrays] = useState<ParkingArray[]>(() => {
    const saved = localStorage.getItem('park_arrays');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('載入已儲存的停車陣列失敗：', e);
      }
    }
    return [DEFAULT_ARRAY];
  });
  const [activeArrayId, setActiveArrayId] = useState<string>(DEFAULT_ARRAY.id);

  // 當 arrays 變更時，自動儲存至 localStorage
  useEffect(() => {
    localStorage.setItem('park_arrays', JSON.stringify(arrays));
  }, [arrays]);

  /**
   * 新增陣列：由 Modal 傳入名稱、初始行列數與資料表類型，全部空位讓使用者從頭手動配置
   */
  const addArray = async (name: string, rows: number, cols: number, dbTable: 'parking_spots' | 'car_parking_spots') => {
    // 產生像 ARR-BEB3 的 4 碼隨機 ID，與右圖格式一致
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `ARR-${randCode}`;
    const arrayType = dbTable === 'car_parking_spots' ? 'car' : 'motorcycle';

    // NOTE: 新陣列全空白，不帶假資料，讓管理員從頭配置
    const blankSpots = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (__, c) => ({
        id: `${id}-${r}-${c}`,
        number: `${String.fromCharCode(65 + r)}-${String(c + 1).padStart(2, '0')}`,
        status: 'available' as const,
      }))
    ).flat();

    // 立即寫入對應的 Supabase 資料表
    try {
      const dbSpots = blankSpots.map(s => ({
        id: s.id,
        number: s.number,
        status: s.status,
        occupied_by: null,
        occupied_at: null,
      }));
      // 批次寫入
      for (let i = 0; i < dbSpots.length; i += 100) {
        const { error } = await supabase.from(dbTable).insert(dbSpots.slice(i, i + 100));
        if (error) {
          console.error(`Supabase 寫入 ${dbTable} 失敗：`, error);
        } else {
          console.log(`Supabase 寫入 ${dbTable} 成功！批次：${i}`);
        }
      }
    } catch (err) {
      console.error('初始化新增陣列車位至 Supabase 發生異常：', err);
    }

    const newArray: ParkingArray = { 
      id, 
      name, 
      rows, 
      cols, 
      spots: blankSpots, 
      isLive: true, 
      dbTable, 
      arrayType 
    };
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

  /**
   * 刪除指定陣列：在前端移除，並連動將 Supabase 資料庫中的車位清空
   */
  const deleteArray = async (id: string) => {
    if (id === 'array-default') return; // 預設的主停車場不給刪除

    const targetArray = arrays.find(a => a.id === id);
    if (!targetArray) return;

    // 從 Supabase 中清除該陣列的所有車位，防止資料庫膨脹
    try {
      const table = targetArray.dbTable || 'parking_spots';
      const { error } = await supabase
        .from(table)
        .delete()
        .like('id', `${id}-%`);
      if (error) {
        console.error('從 Supabase 刪除車位資料失敗：', error);
      }
    } catch (err) {
      console.error('連線 Supabase 刪除車位失敗：', err);
    }

    setArrays(prev => {
      const filtered = prev.filter(arr => arr.id !== id);
      // 如果被刪除的是當前的 activeArray，則自動退回到主停車場
      if (activeArrayId === id) {
        setActiveArrayId('array-default');
      }
      return filtered;
    });
  };

  const context: GridContext = {
    arrays,
    activeArrayId,
    setActiveArrayId,
    addArray,
    updateArray,
    deleteArray,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout context={context} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/spots" element={<SpotManager />} />
          <Route path="/users" element={<UserManager />} />
          <Route path="/community" element={<CommunityManager />} />
          <Route path="/grid" element={<GridConfig key={context.activeArrayId} context={context} />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
