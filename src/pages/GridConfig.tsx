import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Save, RefreshCcw, AlertTriangle, MousePointerClick } from 'lucide-react';

interface SpotData {
  id: string;
  status: 'available' | 'occupied' | 'disabled' | 'mine';
  number: string;
}

export default function GridConfig() {
  const [spots, setSpots] = useState<SpotData[]>([]);
  const [currentRows, setCurrentRows] = useState(0);
  const [currentCols, setCurrentCols] = useState(0);
  const [newRows, setNewRows] = useState(24);
  const [newCols, setNewCols] = useState(23);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentGrid();
    // 每 5 秒自動重新整理，讓圖示即時反映學生端的停車狀態
    const interval = setInterval(fetchCurrentGrid, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentGrid = async () => {
    setLoading(true);
    const { data } = await supabase.from('parking_spots').select('id, status, number');
    if (data) {
      setSpots(data as SpotData[]);
      let maxRow = 0, maxCol = 0;
      data.forEach((spot: any) => {
        const parts = spot.id.split('-');
        if (parts.length === 3) {
          const r = parseInt(parts[1]);
          const c = parseInt(parts[2]);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
      });
      setCurrentRows(maxRow + 1);
      setCurrentCols(maxCol + 1);
      setNewRows(maxRow + 1);
      setNewCols(maxCol + 1);
    }
    setLoading(false);
  };

  // 點擊切換車位狀態，立刻儲存到資料庫
  const handleToggleSpot = useCallback(async (spotId: string, currentStatus: string) => {
    if (togglingId) return;
    setTogglingId(spotId);
    // 三狀態循環：available → occupied → disabled → available
    const nextStatus =
      currentStatus === 'available' ? 'occupied' :
      currentStatus === 'occupied' ? 'disabled' : 'available';

    const { error } = await supabase
      .from('parking_spots')
      .update({
        status: nextStatus,
        occupied_by: null,
        occupied_at: nextStatus === 'occupied' ? new Date().toISOString() : null,
      })
      .eq('id', spotId);

    if (!error) {
      setSpots(prev => prev.map(s => s.id === spotId ? { ...s, status: nextStatus as any } : s));
    } else {
      console.error('切換失敗：', error.message);
    }
    setTogglingId(null);
  }, [togglingId]);

  const handleApply = async () => {
    if (newRows < 1 || newCols < 1 || newRows > 50 || newCols > 50) {
      setMessage('行列數必須在 1 ~ 50 之間');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { data: allSpots } = await supabase.from('parking_spots').select('id, status, number');
      if (!allSpots) throw new Error('無法讀取車位資料');

      const toDelete: string[] = [];
      allSpots.forEach((spot: any) => {
        const parts = spot.id.split('-');
        if (parts.length === 3) {
          const r = parseInt(parts[1]);
          const c = parseInt(parts[2]);
          if (r >= newRows || c >= newCols) {
            toDelete.push(spot.id);
          }
        }
      });

      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 100) {
          const batch = toDelete.slice(i, i + 100);
          await supabase.from('parking_spots').delete().in('id', batch);
        }
      }

      const existingIds = new Set(allSpots.map((s: any) => s.id));
      const toInsert: any[] = [];

      for (let r = 0; r < newRows; r++) {
        const rowLetter = String.fromCharCode(65 + r);
        for (let c = 0; c < newCols; c++) {
          const spotId = `S-${r}-${c}`;
          if (!existingIds.has(spotId)) {
            toInsert.push({
              id: spotId,
              number: `${rowLetter}-${String(c + 1).padStart(2, '0')}`,
              status: 'available',
              occupied_by: null,
              occupied_at: null,
            });
          }
        }
      }

      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        await supabase.from('parking_spots').upsert(batch);
      }

      setMessage(`✅ 成功！已調整為 ${newRows} 行 × ${newCols} 列（共 ${newRows * newCols} 個車位）。刪除 ${toDelete.length} 個，新增 ${toInsert.length} 個。`);
      setCurrentRows(newRows);
      setCurrentCols(newCols);
      await fetchCurrentGrid();
    } catch (err: any) {
      setMessage(`❌ 錯誤：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 計算預覽用的最大行列數（取 current 和 new 的最大值）
  const previewRows = Math.max(currentRows, newRows);
  const previewCols = Math.max(currentCols, newCols);

  const spotMap = new Map(spots.map(s => [s.id, s]));

  const getCellType = (r: number, c: number): 'keep' | 'add' | 'remove' | 'outside' => {
    const inCurrent = r < currentRows && c < currentCols;
    const inNew = r < newRows && c < newCols;
    if (inCurrent && inNew) return 'keep';
    if (!inCurrent && inNew) return 'add';
    if (inCurrent && !inNew) return 'remove';
    return 'outside';
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <RefreshCcw size={24} className="animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-[#8B5CF6] tracking-widest uppercase mb-2 block">Grid Configuration</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">車位陣列設定.</h1>
      </div>

      {/* 上方：目前數據 + 調整控件 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 目前狀態 */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">目前陣列</h3>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-4xl font-serif font-black text-editorial-ink">{currentRows}</span>
              <p className="text-xs font-bold text-slate-400 mt-1">行 (Rows)</p>
            </div>
            <span className="text-3xl font-bold text-slate-300">×</span>
            <div className="text-center">
              <span className="text-4xl font-serif font-black text-editorial-ink">{currentCols}</span>
              <p className="text-xs font-bold text-slate-400 mt-1">列 (Cols)</p>
            </div>
            <span className="text-3xl font-bold text-slate-300">=</span>
            <div className="text-center">
              <span className="text-4xl font-serif font-black text-[#10B981]">{currentRows * currentCols}</span>
              <p className="text-xs font-bold text-slate-400 mt-1">總車位</p>
            </div>
          </div>
        </div>

        {/* 調整大小 */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">調整新陣列大小</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">行數 (Rows)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewRows(Math.max(1, newRows - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95">
                  <Minus size={14} />
                </button>
                <input type="number" min={1} max={50} value={newRows} onChange={e => setNewRows(parseInt(e.target.value) || 1)}
                  className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewRows(Math.min(50, newRows + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-300 pt-5">×</span>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">列數 (Cols)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewCols(Math.max(1, newCols - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95">
                  <Minus size={14} />
                </button>
                <input type="number" min={1} max={50} value={newCols} onChange={e => setNewCols(parseInt(e.target.value) || 1)}
                  className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewCols(Math.min(50, newCols + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">圖例：</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#10B981]"></div>
          <span className="text-xs font-bold text-slate-500">空位（點擊→佔用）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#3B82F6]"></div>
          <span className="text-xs font-bold text-slate-500">學生停車中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#EF4444]"></div>
          <span className="text-xs font-bold text-slate-500">佔用（點擊→停用）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-slate-400"></div>
          <span className="text-xs font-bold text-slate-500">停用（點擊→空位）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 bg-blue-50"></div>
          <span className="text-xs font-bold text-slate-500">將新增</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-red-200 opacity-60"></div>
          <span className="text-xs font-bold text-slate-500">將刪除</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-400">
          <MousePointerClick size={14} />
          <span className="text-xs font-bold">點擊現有車位立刻切換狀態</span>
        </div>
      </div>

      {/* 矩陣預覽圖 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-6 p-6 overflow-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`,
            minWidth: `${previewCols * 32}px`,
          }}
        >
          {Array.from({ length: previewRows }).map((_, r) =>
            Array.from({ length: previewCols }).map((__, c) => {
              const cellType = getCellType(r, c);
              const spotId = `S-${r}-${c}`;
              const spot = spotMap.get(spotId);
              const isToggling = togglingId === spotId;

              let cellClass = '';
              let title = '';
              let clickable = false;

              if (cellType === 'keep') {
                clickable = true;
                if (spot?.status === 'mine') {
                  // 學生已停車的車位：顯示藍色，不可被管理員點擊切換
                  cellClass = 'bg-[#3B82F6] cursor-default';
                  title = `${spot.number} — 學生已停車`;
                  clickable = false;
                } else if (spot?.status === 'occupied') {
                  cellClass = 'bg-[#EF4444] hover:bg-red-600 cursor-pointer';
                  title = `${spot.number} — 佔用中，點擊轉為停用`;
                } else if (spot?.status === 'disabled') {
                  cellClass = 'bg-slate-400 hover:bg-slate-500 cursor-pointer';
                  title = `${spot.number} — 停用中，點擊釋放為空位`;
                } else {
                  cellClass = 'bg-[#10B981] hover:bg-emerald-600 cursor-pointer';
                  title = `${spot?.number ?? spotId} — 空位，點擊設為佔用`;
                }
              } else if (cellType === 'add') {
                cellClass = 'bg-blue-50 border-2 border-dashed border-[#3B82F6]';
                title = '將新增此車位';
              } else if (cellType === 'remove') {
                cellClass = 'bg-red-200 opacity-50';
                title = '將刪除此車位';
              } else {
                return null;
              }

              return (
                <div
                  key={spotId}
                  title={title}
                  onClick={clickable ? () => handleToggleSpot(spotId, spot!.status) : undefined}
                  className={`h-7 rounded transition-all duration-150 ${cellClass} ${isToggling ? 'opacity-40' : ''} ${clickable ? 'active:scale-90' : ''}`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* 警告 + 套用按鈕 */}
      {(newRows !== currentRows || newCols !== currentCols) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl mb-6 text-amber-700 text-xs font-bold">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            調整後將產生 <strong>{newRows * newCols}</strong> 個車位。
            {newRows < currentRows || newCols < currentCols
              ? ` 縮小陣列會永久刪除超出範圍的車位資料，請確認操作。`
              : ` 擴大陣列將新增空位。`}
          </span>
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={saving || (newRows === currentRows && newCols === currentCols)}
        className="w-full py-4 bg-editorial-ink text-white rounded-2xl font-bold tracking-wide hover:bg-black hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 flex justify-center items-center gap-2"
      >
        {saving ? (
          <><RefreshCcw size={16} className="animate-spin" /> 調整中...</>
        ) : (
          <><Save size={16} /> 套用新陣列</>
        )}
      </button>

      {message && (
        <p className={`mt-4 text-sm font-bold text-center ${message.startsWith('✅') ? 'text-[#10B981]' : message.startsWith('❌') ? 'text-red-500' : 'text-amber-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
