import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Minus, Save, MousePointerClick, RefreshCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GridContext, SpotData, DbSpot } from '../types/grid';

interface GridConfigProps {
  context: GridContext;
}

export default function GridConfig({ context }: GridConfigProps) {
  const { arrays, activeArrayId, updateArray } = context;
  const activeArray = arrays.find(a => a.id === activeArrayId) ?? arrays[0];
  const isLive = activeArray.isLive === true;

  const [newRows, setNewRows] = useState(activeArray.rows);
  const [newCols, setNewCols] = useState(activeArray.cols);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isLive);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 用來判斷是否為第一次 fetch，僅第一次才更新 newRows/newCols 與顯示 loading
  const isInitialFetch = useRef(true);

  // ─── Supabase 即時模式 ────────────────────────────────────────────────

  const fetchLiveGrid = useCallback(async () => {
    const table = activeArray.dbTable || 'parking_spots';
    const prefix = activeArray.id === 'array-default' ? 'S-%' : `${activeArray.id}-%`;
    const { data } = await supabase
      .from(table)
      .select('id, status, number')
      .like('id', prefix);

    if (data && data.length > 0) {
      let maxRow = 0, maxCol = 0;
      const spotsData = data as DbSpot[];
      spotsData.forEach(spot => {
        const parts = spot.id.split('-');
        const rIndex = parts.length - 2;
        const cIndex = parts.length - 1;
        if (parts.length >= 3) {
          const r = parseInt(parts[rIndex]);
          const c = parseInt(parts[cIndex]);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
      });
      const rows = maxRow + 1;
      const cols = maxCol + 1;
      const mappedSpots: SpotData[] = spotsData.map(spot => {
        const parts = spot.id.split('-');
        const rIndex = parts.length - 2;
        const cIndex = parts.length - 1;
        return {
          id: `${activeArray.id}-${parts[rIndex]}-${parts[cIndex]}`,
          number: spot.number,
          status: spot.status as SpotData['status'],
        };
      });
      // 只更新 spots，不觸發 newRows/newCols 的 setState（避免 loading 閃爍）
      updateArray(activeArray.id, { rows, cols, spots: mappedSpots });
      if (isInitialFetch.current) {
        setNewRows(rows);
        setNewCols(cols);
        isInitialFetch.current = false;
      }
    }
    setLoading(false);
  }, [activeArray.id, activeArray.dbTable, updateArray]);

  useEffect(() => {
    if (!isLive) return;
    isInitialFetch.current = true;
    queueMicrotask(() => {
      fetchLiveGrid();
    });
    const table = activeArray.dbTable || 'parking_spots';
    const sub = supabase.channel(`spots-grid-config-${activeArray.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, fetchLiveGrid)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [isLive, activeArray.id, activeArray.dbTable, fetchLiveGrid]);

  const handleToggleLive = useCallback(async (spotId: string, currentStatus: SpotData['status']) => {
    if (togglingId || currentStatus === 'mine') return;
    setTogglingId(spotId);
    
    const table = activeArray.dbTable || 'parking_spots';
    const parts = spotId.split('-');
    const r = parts[parts.length - 2];
    const c = parts[parts.length - 1];
    const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

    const nextStatus: SpotData['status'] =
      currentStatus === 'available' ? 'occupied' :
      currentStatus === 'occupied' ? 'disabled' : 'available';
    const { error } = await supabase
      .from(table)
      .update({ status: nextStatus, occupied_by: null, occupied_at: nextStatus === 'occupied' ? new Date().toISOString() : null })
      .eq('id', dbId);
    if (!error) {
      updateArray(activeArray.id, {
        spots: arrays.find(a => a.id === activeArray.id)?.spots.map(s =>
          s.id === spotId ? { ...s, status: nextStatus } : s
        ) ?? [],
      });
    }
    setTogglingId(null);
  }, [togglingId, arrays, activeArray.id, activeArray.dbTable, updateArray]);

  const handleApplyLive = async () => {
    if (newRows < 1 || newCols < 1 || newRows > 50 || newCols > 50) { setMessage('行列數必須在 1 ~ 50 之間'); return; }
    setSaving(true); setMessage('');
    const table = activeArray.dbTable || 'parking_spots';
    const prefix = activeArray.id === 'array-default' ? 'S-%' : `${activeArray.id}-%`;
    try {
      const { data: allSpots } = await supabase
        .from(table)
        .select('id, status, number')
        .like('id', prefix);
      if (!allSpots) throw new Error('無法讀取車位資料');
      const typedAllSpots = allSpots as DbSpot[];
      
      const toDelete = typedAllSpots
        .filter(s => {
          const p = s.id.split('-');
          const rIndex = p.length - 2;
          const cIndex = p.length - 1;
          return p.length >= 3 && (parseInt(p[rIndex]) >= newRows || parseInt(p[cIndex]) >= newCols);
        })
        .map(s => s.id);
        
      for (let i = 0; i < toDelete.length; i += 100) {
        await supabase.from(table).delete().in('id', toDelete.slice(i, i + 100));
      }
      
      const existingIds = new Set(typedAllSpots.map(s => s.id));
      const toInsert: Omit<DbSpot, 'created_at'>[] = [];
      for (let r = 0; r < newRows; r++) {
        for (let c = 0; c < newCols; c++) {
          const sid = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;
          if (!existingIds.has(sid)) {
            toInsert.push({
              id: sid,
              number: `${String.fromCharCode(65 + r)}-${String(c + 1).padStart(2, '0')}`,
              status: 'available',
              occupied_by: null,
              occupied_at: null
            });
          }
        }
      }
      for (let i = 0; i < toInsert.length; i += 100) {
        await supabase.from(table).upsert(toInsert.slice(i, i + 100));
      }
      setMessage(`✅ 成功！已調整為 ${newRows} 行 × ${newCols} 列。`);
      await fetchLiveGrid();
    } catch (err) {
      const errorVal = err as Error;
      setMessage(`❌ 錯誤：${errorVal.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── 本地假資料模式 ───────────────────────────────────────────────────

  const handleToggleLocal = useCallback((spotId: string, currentStatus: SpotData['status']) => {
    if (currentStatus === 'mine') return;
    const nextStatus: SpotData['status'] =
      currentStatus === 'available' ? 'occupied' :
      currentStatus === 'occupied' ? 'disabled' : 'available';
    updateArray(activeArray.id, { spots: activeArray.spots.map(s => s.id === spotId ? { ...s, status: nextStatus } : s) });
  }, [activeArray, updateArray]);

  const handleApplyLocal = () => {
    if (newRows < 1 || newCols < 1 || newRows > 50 || newCols > 50) { setMessage('行列數必須在 1 ~ 50 之間'); return; }
    const prefix = activeArray.id;
    const existingMap = new Map(activeArray.spots.map(s => [s.id, s]));
    const updatedSpots: SpotData[] = [];
    for (let r = 0; r < newRows; r++) for (let c = 0; c < newCols; c++) {
      const id = `${prefix}-${r}-${c}`;
      updatedSpots.push(existingMap.get(id) ?? { id, number: `${String.fromCharCode(65 + r)}-${String(c + 1).padStart(2, '0')}`, status: 'available' });
    }
    updateArray(activeArray.id, { rows: newRows, cols: newCols, spots: updatedSpots });
    setMessage(`✅ 已調整為 ${newRows} 行 × ${newCols} 列（共 ${newRows * newCols} 個車位）`);
    setTimeout(() => setMessage(''), 3000);
  };

  // ─── 共用 ─────────────────────────────────────────────────────────────

  const handleToggleSpot = isLive ? handleToggleLive : handleToggleLocal;
  const handleApply = isLive ? handleApplyLive : handleApplyLocal;
  const currentRows = activeArray.rows;
  const currentCols = activeArray.cols;
  const previewRows = Math.max(currentRows, newRows);
  const previewCols = Math.max(currentCols, newCols);
  const spotMap = new Map(activeArray.spots.map(s => [s.id, s]));

  const getCellType = (r: number, c: number) => {
    const inCurrent = r < currentRows && c < currentCols;
    const inNew = r < newRows && c < newCols;
    if (inCurrent && inNew) return 'keep';
    if (!inCurrent && inNew) return 'add';
    if (inCurrent && !inNew) return 'remove';
    return 'outside';
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <RefreshCcw size={24} className="animate-spin text-slate-300" />
      <p className="text-xs font-bold text-slate-400">正在從資料庫載入真實車位資料...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-[#8B5CF6] tracking-widest uppercase mb-2 block">Grid Configuration</span>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">
            {activeArray.name}
            <span className="ml-3 text-lg text-slate-300 font-sans font-normal">車位陣列設定</span>
          </h1>
          {isLive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />即時連線
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">目前陣列</h3>
          <div className="flex items-center gap-6">
            <div className="text-center"><span className="text-4xl font-serif font-black text-editorial-ink">{currentRows}</span><p className="text-xs font-bold text-slate-400 mt-1">行 (Rows)</p></div>
            <span className="text-3xl font-bold text-slate-300">×</span>
            <div className="text-center"><span className="text-4xl font-serif font-black text-editorial-ink">{currentCols}</span><p className="text-xs font-bold text-slate-400 mt-1">列 (Cols)</p></div>
            <span className="text-3xl font-bold text-slate-300">=</span>
            <div className="text-center"><span className="text-4xl font-serif font-black text-[#10B981]">{currentRows * currentCols}</span><p className="text-xs font-bold text-slate-400 mt-1">總車位</p></div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">調整新陣列大小</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">行數 (Rows)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewRows(Math.max(1, newRows - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Minus size={14} /></button>
                <input type="number" min={1} max={50} value={newRows} onChange={e => setNewRows(parseInt(e.target.value) || 1)} className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewRows(Math.min(50, newRows + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Plus size={14} /></button>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-300 pt-5">×</span>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">列數 (Cols)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewCols(Math.max(1, newCols - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Minus size={14} /></button>
                <input type="number" min={1} max={50} value={newCols} onChange={e => setNewCols(parseInt(e.target.value) || 1)} className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewCols(Math.min(50, newCols + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTE: 統計摘要條 — 僅在有車位資料時顯示，管理員一眼掌握現況 */}
      {activeArray.spots.length > 0 && (() => {
        const available = activeArray.spots.filter(s => s.status === 'available').length;
        const occupied  = activeArray.spots.filter(s => s.status === 'occupied').length;
        const mine      = activeArray.spots.filter(s => s.status === 'mine').length;
        const disabled  = activeArray.spots.filter(s => s.status === 'disabled').length;
        const total     = activeArray.spots.length;
        const statItems = [
          { label: '空位', value: available, color: 'text-[#10B981]', bg: 'bg-emerald-50', bar: 'bg-[#10B981]' },
          { label: '學生停車中', value: mine, color: 'text-[#3B82F6]', bg: 'bg-blue-50', bar: 'bg-[#3B82F6]' },
          { label: '佔用', value: occupied, color: 'text-[#EF4444]', bg: 'bg-red-50', bar: 'bg-[#EF4444]' },
          { label: '停用', value: disabled, color: 'text-slate-500', bg: 'bg-slate-50', bar: 'bg-slate-400' },
        ];
        return (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {statItems.map(({ label, value, color, bg, bar }) => (
              <div key={label} className={`${bg} rounded-2xl p-4`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-3xl font-serif font-black ${color}`}>{value}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                  <div className={`h-full rounded-full ${bar} transition-all duration-500`}
                    style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {total > 0 ? ((value / total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">圖例：</span>
        {[['bg-[#10B981]','空位（點擊→佔用）'],['bg-[#3B82F6]','學生停車中'],['bg-[#EF4444]','佔用（點擊→停用）'],['bg-slate-400','停用（點擊→空位）']].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5"><div className={`w-5 h-5 rounded ${cls}`} /><span className="text-xs font-bold text-slate-500">{label}</span></div>
        ))}
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 bg-blue-50" /><span className="text-xs font-bold text-slate-500">將新增</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-red-200 opacity-60" /><span className="text-xs font-bold text-slate-500">將刪除</span></div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-400"><MousePointerClick size={14} /><span className="text-xs font-bold">點擊現有車位立刻切換狀態</span></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-6 p-6 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`, minWidth: `${previewCols * 32}px` }}>
          {Array.from({ length: previewRows }).map((_, r) =>
            Array.from({ length: previewCols }).map((__, c) => {
              const cellType = getCellType(r, c);
              const spotId = `${activeArray.id}-${r}-${c}`;
              const spot = spotMap.get(spotId);
              const isToggling = togglingId === spotId;
              if (cellType === 'outside') return null;

              let cellClass: string;
              let title: string;
              let clickable = false;
              let cellContent: string;
              let textColorClass = 'text-white/25 hover:text-white';

              if (cellType === 'keep') {
                if (spot?.status === 'mine') { cellClass = 'bg-[#3B82F6] cursor-default hover:scale-105 hover:shadow-[0_0_10px_rgba(59,130,246,0.6)]'; title = `${spot.number} — 學生已停車`; }
                else if (spot?.status === 'occupied') { cellClass = 'bg-[#EF4444] hover:bg-red-600 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(239,68,68,0.7)]'; title = `${spot.number} — 佔用中`; clickable = true; }
                else if (spot?.status === 'disabled') { cellClass = 'bg-slate-400 hover:bg-slate-500 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(148,163,184,0.7)]'; title = `${spot.number} — 停用中`; clickable = true; }
                else { cellClass = 'bg-[#10B981] hover:bg-emerald-600 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]'; title = `${spot?.number ?? spotId} — 空位`; clickable = true; }
                cellContent = spot ? spot.number.replace('-', '') : '';
              } else if (cellType === 'add') {
                cellClass = 'bg-blue-50 border-2 border-dashed border-[#3B82F6] hover:scale-105 hover:bg-blue-100/50';
                title = '將新增此車位';
                cellContent = '+';
                textColorClass = 'text-[#3B82F6]/40 hover:text-[#3B82F6]';
              } else {
                cellClass = 'bg-red-200 opacity-50 hover:scale-105 hover:opacity-80';
                title = '將刪除此車位';
                cellContent = spot ? spot.number.replace('-', '') : '-';
                textColorClass = 'text-red-700/40 line-through hover:text-red-700';
              }

              return (
                <div key={spotId} title={title}
                  onClick={clickable ? () => handleToggleSpot(spotId, spot!.status) : undefined}
                  className={`h-7 rounded transition-all duration-300 shadow-sm flex items-center justify-center text-[8px] font-bold tracking-tighter select-none ${cellClass} ${textColorClass} ${isToggling ? 'opacity-40' : ''} ${clickable ? 'active:scale-90' : ''}`}
                >
                  {cellContent}
                </div>
              );
            })
          )}
        </div>
      </div>

      {(newRows !== currentRows || newCols !== currentCols) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl mb-6 text-amber-700 text-xs font-bold shadow-inner">
          <AlertTriangle size={16} className="shrink-0" />
          <span>調整後將產生 <strong>{newRows * newCols}</strong> 個車位。{isLive && (newRows < currentRows || newCols < currentCols) ? ' 縮小將永久刪除 Supabase 中超出範圍的資料，請確認。' : ''}</span>
        </div>
      )}

      <button onClick={handleApply} disabled={saving || (newRows === currentRows && newCols === currentCols)}
        className="w-full py-4 bg-editorial-ink text-white rounded-2xl font-bold tracking-wide hover:bg-black hover:shadow-xl hover:shadow-slate-950/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-30 flex justify-center items-center gap-2 cursor-pointer">
        {saving ? <><RefreshCcw size={16} className="animate-spin" /> 調整中...</> : <><Save size={16} /> 套用新陣列</>}
      </button>

      {message && (
        <p className={`mt-4 text-sm font-bold text-center ${message.startsWith('✅') ? 'text-[#10B981]' : message.startsWith('❌') ? 'text-red-500' : 'text-amber-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
