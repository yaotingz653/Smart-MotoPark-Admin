import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Save, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function GridConfig() {
  const [currentRows, setCurrentRows] = useState(0);
  const [currentCols, setCurrentCols] = useState(0);
  const [newRows, setNewRows] = useState(24);
  const [newCols, setNewCols] = useState(23);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentGrid();
  }, []);

  const fetchCurrentGrid = async () => {
    setLoading(true);
    const { data } = await supabase.from('parking_spots').select('id');
    if (data) {
      // 解析現有車位 ID 來算出目前的行列數
      let maxRow = 0, maxCol = 0;
      data.forEach(spot => {
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

  const handleApply = async () => {
    if (newRows < 1 || newCols < 1 || newRows > 50 || newCols > 50) {
      setMessage('行列數必須在 1 ~ 50 之間');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      // 1. 先刪除超出範圍的車位
      const { data: allSpots } = await supabase.from('parking_spots').select('id, status');
      if (!allSpots) throw new Error('無法讀取車位資料');

      const toDelete: string[] = [];
      allSpots.forEach(spot => {
        const parts = spot.id.split('-');
        if (parts.length === 3) {
          const r = parseInt(parts[1]);
          const c = parseInt(parts[2]);
          if (r >= newRows || c >= newCols) {
            toDelete.push(spot.id);
          }
        }
      });

      // 刪除超出範圍的車位
      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += 100) {
          const batch = toDelete.slice(i, i + 100);
          await supabase.from('parking_spots').delete().in('id', batch);
        }
      }

      // 2. 新增缺少的車位
      const existingIds = new Set(allSpots.map(s => s.id));
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

      // 分批插入
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        await supabase.from('parking_spots').upsert(batch);
      }

      setMessage(`✅ 成功！已調整為 ${newRows} 行 × ${newCols} 列（共 ${newRows * newCols} 個車位）。刪除 ${toDelete.length} 個，新增 ${toInsert.length} 個。`);
      setCurrentRows(newRows);
      setCurrentCols(newCols);
    } catch (err: any) {
      setMessage(`❌ 錯誤：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400 font-bold">載入中...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-[#8B5CF6] tracking-widest uppercase mb-2 block">Grid Configuration</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">車位陣列設定.</h1>
      </div>

      {/* 目前狀態 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-6">
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

      {/* 調整設定 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">調整為新的陣列大小</h3>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">行數 (Rows)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNewRows(Math.max(1, newRows - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={newRows}
                onChange={e => setNewRows(parseInt(e.target.value) || 1)}
                className="w-20 text-center text-2xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
              <button
                onClick={() => setNewRows(Math.min(50, newRows + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <span className="text-3xl font-bold text-slate-300 pt-6">×</span>

          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">列數 (Cols)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNewCols(Math.max(1, newCols - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={newCols}
                onChange={e => setNewCols(parseInt(e.target.value) || 1)}
                className="w-20 text-center text-2xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
              <button
                onClick={() => setNewCols(Math.min(50, newCols + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl mb-6 text-amber-700 text-xs font-bold">
          <AlertTriangle size={16} className="shrink-0" />
          <span>調整後將產生 {newRows * newCols} 個車位。縮小陣列會刪除超出範圍的車位，學生端會即時同步更新。</span>
        </div>

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
    </div>
  );
}
