import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Minus, Save, MousePointerClick, RefreshCcw, AlertTriangle, X, ShieldAlert, Clock, User, Ban, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GridContext, SpotData, DbSpot } from '../types/grid';
import { Tooltip } from './Dashboard';

interface GridConfigProps {
  context: GridContext;
}

export default function GridConfig({ context }: GridConfigProps) {
  const { arrays, activeArrayId, updateArray, t } = context;
  const activeArray = arrays.find(a => a.id === activeArrayId) ?? arrays[0];
  const isLive = activeArray.isLive === true;

  const [newRows, setNewRows] = useState(activeArray.rows);
  const [newCols, setNewCols] = useState(activeArray.cols);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isLive);
  const [saving, setSaving] = useState(false);

  // ─── 車位點選詳細 Modal 狀態 ──────────────────────────────────────────
  const [selectedSpot, setSelectedSpot] = useState<SpotData | null>(null);
  const [spotDetails, setSpotDetails] = useState<{
    userName: string;
    parkedAt: string | null;
    duration: string;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  // 使用者對照 Map
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // 用來判斷是否為第一次 fetch，僅第一次才更新 newRows/newCols 與顯示 loading
  const isInitialFetch = useRef(true);

  // ─── 載入使用者名冊對照表 ───────────────────────────────────────────────
  const fetchUserMap = useCallback(async () => {
    const { data } = await supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } }));
    if (data?.users) {
      const map: Record<string, string> = {};
      data.users.forEach(u => {
        map[u.id] = (u.user_metadata?.name as string) || u.email?.split('@')[0] || '未知使用者';
      });
      setUserMap(map);
    }
  }, []);

  useEffect(() => {
    fetchUserMap();
  }, [fetchUserMap]);

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
      // 只更新 spots，不觸發 newRows/newCols 的 setState
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

  // ─── 點選車位開啟彈窗並拉取停放詳情 ──────────────────────────────────────
  const handleSpotClick = async (spot: SpotData) => {
    setSelectedSpot(spot);
    setSpotDetails(null);
    if (!isLive) {
      // 本地假資料模式直接生成簡單詳情
      if (spot.status === 'occupied') {
        setSpotDetails({
          userName: '模擬外部車輛 / 訪客',
          parkedAt: new Date().toLocaleString(),
          duration: '35 分鐘'
        });
      }
      return;
    }

    if (spot.status === 'mine' || spot.status === 'occupied') {
      setDetailsLoading(true);
      const table = activeArray.dbTable || 'parking_spots';
      const parts = spot.id.split('-');
      const r = parts[parts.length - 2];
      const c = parts[parts.length - 1];
      const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

      const { data, error } = await supabase
        .from(table)
        .select('occupied_by, occupied_at')
        .eq('id', dbId)
        .single();

      if (!error && data) {
        const userId = data.occupied_by;
        const parkedAt = data.occupied_at;
        const name = userId ? (userMap[userId] || '未知使用者') : '外部車輛';
        let duration = '—';
        if (parkedAt) {
          const diffMs = Date.now() - new Date(parkedAt).getTime();
          const mins = Math.floor(diffMs / 60000);
          const hours = Math.floor(mins / 60);
          if (hours > 0) duration = `${hours}小時 ${mins % 60}分`;
          else duration = `${mins} 分鐘`;
        }
        setSpotDetails({
          userName: name,
          parkedAt: parkedAt ? new Date(parkedAt).toLocaleString() : null,
          duration
        });
      } else {
        setSpotDetails({
          userName: '外部車輛 / 訪客',
          parkedAt: null,
          duration: '—'
        });
      }
      setDetailsLoading(false);
    }
  };

  // ─── Modal 按鈕控制指令 ────────────────────────────────────────────────
  const handleModalForceRelease = async () => {
    if (!selectedSpot) return;
    if (!isLive) {
      // 本地模式
      updateArray(activeArray.id, {
        spots: activeArray.spots.map(s => s.id === selectedSpot.id ? { ...s, status: 'available' } : s)
      });
      setSelectedSpot(null);
      return;
    }

    setActionProcessing(true);
    const table = activeArray.dbTable || 'parking_spots';
    const parts = selectedSpot.id.split('-');
    const r = parts[parts.length - 2];
    const c = parts[parts.length - 1];
    const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

    await supabase.from(table).update({
      status: 'available',
      occupied_by: null,
      occupied_at: null
    }).eq('id', dbId);

    setSelectedSpot(null);
    setActionProcessing(false);
    await fetchLiveGrid();
  };

  const handleModalDisable = async () => {
    if (!selectedSpot) return;
    if (!isLive) {
      updateArray(activeArray.id, {
        spots: activeArray.spots.map(s => s.id === selectedSpot.id ? { ...s, status: 'disabled' } : s)
      });
      setSelectedSpot(null);
      return;
    }

    setActionProcessing(true);
    const table = activeArray.dbTable || 'parking_spots';
    const parts = selectedSpot.id.split('-');
    const r = parts[parts.length - 2];
    const c = parts[parts.length - 1];
    const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

    await supabase.from(table).update({
      status: 'disabled',
      occupied_by: null,
      occupied_at: null
    }).eq('id', dbId);

    setSelectedSpot(null);
    setActionProcessing(false);
    await fetchLiveGrid();
  };

  const handleModalEnable = async () => {
    if (!selectedSpot) return;
    if (!isLive) {
      updateArray(activeArray.id, {
        spots: activeArray.spots.map(s => s.id === selectedSpot.id ? { ...s, status: 'available' } : s)
      });
      setSelectedSpot(null);
      return;
    }

    setActionProcessing(true);
    const table = activeArray.dbTable || 'parking_spots';
    const parts = selectedSpot.id.split('-');
    const r = parts[parts.length - 2];
    const c = parts[parts.length - 1];
    const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

    await supabase.from(table).update({
      status: 'available',
      occupied_by: null,
      occupied_at: null
    }).eq('id', dbId);

    setSelectedSpot(null);
    setActionProcessing(false);
    await fetchLiveGrid();
  };

  const handleModalMockOccupy = async () => {
    if (!selectedSpot) return;
    if (!isLive) {
      updateArray(activeArray.id, {
        spots: activeArray.spots.map(s => s.id === selectedSpot.id ? { ...s, status: 'occupied' } : s)
      });
      setSelectedSpot(null);
      return;
    }

    setActionProcessing(true);
    const table = activeArray.dbTable || 'parking_spots';
    const parts = selectedSpot.id.split('-');
    const r = parts[parts.length - 2];
    const c = parts[parts.length - 1];
    const dbId = activeArray.id === 'array-default' ? `S-${r}-${c}` : `${activeArray.id}-${r}-${c}`;

    await supabase.from(table).update({
      status: 'occupied',
      occupied_by: null,
      occupied_at: new Date().toISOString()
    }).eq('id', dbId);

    setSelectedSpot(null);
    setActionProcessing(false);
    await fetchLiveGrid();
  };

  // ─── 調整大小邏輯 ──────────────────────────────────────────────────────

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
      <p className="text-xs font-bold text-slate-400">{t('grid.fetch_live_loading')}</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-[#8B5CF6] tracking-widest uppercase mb-2 block">{t('Grid Configuration')}</span>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">
            {activeArray.name}
            <span className="ml-3 text-lg text-slate-300 font-sans font-normal">{t('grid.title')}</span>
          </h1>
          {isLive && (
            <Tooltip content="此車位陣列已與雲端資料庫即時對接，所有狀態將即時自動同步更新。">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold uppercase tracking-widest cursor-help">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{t('realtime')}
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('grid.current')}</h3>
          <div className="flex items-center gap-6">
            <div className="text-center"><span className="text-4xl font-serif font-black text-editorial-ink">{currentRows}</span><p className="text-xs font-bold text-slate-400 mt-1">{t('grid.rows')}</p></div>
            <span className="text-3xl font-bold text-slate-300">×</span>
            <div className="text-center"><span className="text-4xl font-serif font-black text-editorial-ink">{currentCols}</span><p className="text-xs font-bold text-slate-400 mt-1">{t('grid.cols')}</p></div>
            <span className="text-3xl font-bold text-slate-300">=</span>
            <div className="text-center"><span className="text-4xl font-serif font-black text-[#10B981]">{currentRows * currentCols}</span><p className="text-xs font-bold text-slate-400 mt-1">{t('grid.total')}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('grid.adjust')}</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('grid.adjust_rows')}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewRows(Math.max(1, newRows - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Minus size={14} /></button>
                <input type="number" min={1} max={50} value={newRows} onChange={e => setNewRows(parseInt(e.target.value) || 1)} className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewRows(Math.min(50, newRows + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Plus size={14} /></button>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-300 pt-5">×</span>
            <div className="flex-grow">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('grid.adjust_cols')}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewCols(Math.max(1, newCols - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Minus size={14} /></button>
                <input type="number" min={1} max={50} value={newCols} onChange={e => setNewCols(parseInt(e.target.value) || 1)} className="w-16 text-center text-xl font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" />
                <button onClick={() => setNewCols(Math.min(50, newCols + 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeArray.spots.length > 0 && (() => {
        const available = activeArray.spots.filter(s => s.status === 'available').length;
        const occupied  = activeArray.spots.filter(s => s.status === 'occupied').length;
        const mine      = activeArray.spots.filter(s => s.status === 'mine').length;
        const disabled  = activeArray.spots.filter(s => s.status === 'disabled').length;
        const total     = activeArray.spots.length;
        const statItems = [
          { label: t('dash.legend_available'), value: available, color: 'text-[#10B981]', bg: 'bg-emerald-50', bar: 'bg-[#10B981]' },
          { label: t('grid.legend_mine'), value: mine, color: 'text-[#3B82F6]', bg: 'bg-blue-50', bar: 'bg-[#3B82F6]' },
          { label: t('dash.legend_occupied'), value: occupied, color: 'text-[#EF4444]', bg: 'bg-red-50', bar: 'bg-[#EF4444]' },
          { label: t('dash.legend_disabled'), value: disabled, color: 'text-slate-500', bg: 'bg-slate-50', bar: 'bg-slate-400' },
        ];
        return (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {statItems.map(({ label, value, color, bg, bar }) => (
              <div key={label} className={`${bg} rounded-2xl p-4`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-3xl font-serif font-black ${color} notranslate`} translate="no">{value}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                  <div className={`h-full rounded-full ${bar} transition-all duration-500`}
                    style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 notranslate" translate="no">
                  {total > 0 ? ((value / total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('grid.legend')}</span>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-[#10B981]" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_available')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-[#3B82F6]" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_mine')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-[#EF4444]" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_occupied')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-slate-400" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_disabled')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 bg-blue-50" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_add')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-red-200 opacity-60" /><span className="text-xs font-bold text-slate-500">{t('grid.legend_remove')}</span></div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-400"><MousePointerClick size={14} /><span className="text-xs font-bold">{t('grid.legend_click_tip')}</span></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-6 p-6 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`, minWidth: `${previewCols * 32}px` }}>
          {Array.from({ length: previewRows }).map((_, r) =>
            Array.from({ length: previewCols }).map((__, c) => {
              const cellType = getCellType(r, c);
              const spotId = `${activeArray.id}-${r}-${c}`;
              const spot = spotMap.get(spotId);
              if (cellType === 'outside') return null;

              let cellClass: string;
              let title: string;
              let clickable = false;
              let cellContent: string;
              let textColorClass = 'text-white/25 hover:text-white';

              if (cellType === 'keep') {
                clickable = true;
                if (spot?.status === 'mine') { cellClass = 'bg-[#3B82F6] hover:bg-blue-600 cursor-pointer hover:scale-105 hover:shadow-[0_0_10px_rgba(59,130,246,0.6)]'; title = `${spot.number} — 學生已停車`; }
                else if (spot?.status === 'occupied') { cellClass = 'bg-[#EF4444] hover:bg-red-600 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(239,68,68,0.7)]'; title = `${spot.number} — 佔用中`; }
                else if (spot?.status === 'disabled') { cellClass = 'bg-slate-400 hover:bg-slate-500 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(148,163,184,0.7)]'; title = `${spot.number} — 停用中`; }
                else { cellClass = 'bg-[#10B981] hover:bg-emerald-600 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]'; title = `${spot?.number ?? spotId} — 空位`; }
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
                  onClick={clickable ? () => handleSpotClick(spot!) : undefined}
                  className={`h-7 rounded transition-all duration-300 shadow-sm flex items-center justify-center text-[8px] font-bold tracking-tighter select-none ${cellClass} ${textColorClass} ${clickable ? 'active:scale-90' : ''}`}
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
          <span>{t('grid.alert_diff', { count: newRows * newCols })}{isLive && (newRows < currentRows || newCols < currentCols) ? t('grid.alert_delete_warn') : ''}</span>
        </div>
      )}

      <button onClick={handleApply} disabled={saving || (newRows === currentRows && newCols === currentCols)}
        className="w-full py-4 bg-editorial-ink text-white rounded-2xl font-bold tracking-wide hover:bg-black hover:shadow-xl hover:shadow-slate-950/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-30 flex justify-center items-center gap-2 cursor-pointer">
        {saving ? <><RefreshCcw size={16} className="animate-spin" /> {t('grid.applying')}</> : <><Save size={16} /> {t('grid.apply')}</>}
      </button>

      {message && (
        <p className={`mt-4 text-sm font-bold text-center ${message.startsWith('✅') ? 'text-[#10B981]' : message.startsWith('❌') ? 'text-red-500' : 'text-amber-600'}`}>
          {message}
        </p>
      )}

      {/* ─── 車位詳細控制互動 Pop-up Modal ────────────────────────────────────── */}
      {selectedSpot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-100 shadow-2xl relative flex flex-col gap-4">
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-[#8B5CF6] uppercase tracking-widest block mb-1">
                {t('spot.detail_title')}
              </span>
              <h2 className="text-2xl font-serif font-black text-editorial-ink flex items-center gap-2">
                {selectedSpot.number}
              </h2>
            </div>

            <div className="border-t border-b border-slate-100 py-4 flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">{t('spot.id')}</span>
                <span className="font-mono font-bold text-slate-600 notranslate" translate="no">{selectedSpot.id}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">{t('spot.status')}</span>
                <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wide text-[9px] ${
                  selectedSpot.status === 'available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  selectedSpot.status === 'occupied' ? 'bg-red-50 text-red-600 border border-red-200' :
                  selectedSpot.status === 'mine' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                  'bg-slate-50 text-slate-500 border border-slate-200'
                }`}>
                  {selectedSpot.status === 'available' ? t('spot.status_available') :
                   selectedSpot.status === 'occupied' ? t('spot.status_occupied') :
                   selectedSpot.status === 'mine' ? t('spot.status_mine') :
                   t('spot.status_disabled')}
                </span>
              </div>

              {/* 只有在停車或佔用中，才展示車主及停放時間細節 */}
              {(selectedSpot.status === 'mine' || selectedSpot.status === 'occupied') && (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 flex items-center gap-1"><User size={13} />{t('spot.parked_user')}</span>
                    <span className="font-bold text-slate-800">
                      {detailsLoading ? <RefreshCcw size={10} className="animate-spin text-slate-400 inline" /> : (spotDetails?.userName ?? t('spot.unknown_user'))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 flex items-center gap-1"><Clock size={13} />{t('spot.parked_time')}</span>
                    <span className="font-bold text-slate-600 notranslate" translate="no">
                      {detailsLoading ? <RefreshCcw size={10} className="animate-spin text-slate-400 inline" /> : (spotDetails?.parkedAt ?? t('spot.no_parked_time'))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 flex items-center gap-1"><Clock size={13} />{t('spot.parked_duration')}</span>
                    <span className="font-bold text-[#FF5D2B] notranslate" translate="no">
                      {detailsLoading ? <RefreshCcw size={10} className="animate-spin text-slate-400 inline" /> : (spotDetails?.duration ?? '—')}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* 控制面板按鈕 */}
            <div className="flex flex-col gap-2.5 mt-2">
              {/* 佔用或學生使用中 ➜ 提供強制釋放與禁用 */}
              {(selectedSpot.status === 'occupied' || selectedSpot.status === 'mine') && (
                <>
                  <Tooltip content="強制將該車位清空並恢復為可用空位。常用於車主忘記退車的狀況。">
                    <button
                      disabled={actionProcessing}
                      onClick={handleModalForceRelease}
                      className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ShieldAlert size={14} />
                      {t('spot.action_force_release')}
                    </button>
                  </Tooltip>
                  <Tooltip content="將車位鎖定為停用維修狀態，此時使用者將無法預約或停入此格。">
                    <button
                      disabled={actionProcessing}
                      onClick={handleModalDisable}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Ban size={14} />
                      {t('spot.action_disable')}
                    </button>
                  </Tooltip>
                </>
              )}

              {/* 空位狀態 ➜ 提供設為故障或模擬佔用 */}
              {selectedSpot.status === 'available' && (
                <>
                  <Tooltip content="模擬一台非系統註冊的外部車輛強行停入此車位的狀況，用於測試異常排查。">
                    <button
                      disabled={actionProcessing}
                      onClick={handleModalMockOccupy}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Car size={14} />
                      {t('spot.action_mock_occupy')}
                    </button>
                  </Tooltip>
                  <Tooltip content="將車位鎖定為停用維修狀態，此時使用者將無法預約或停入此格。">
                    <button
                      disabled={actionProcessing}
                      onClick={handleModalDisable}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Ban size={14} />
                      {t('spot.action_disable')}
                    </button>
                  </Tooltip>
                </>
              )}

              {/* 禁用狀態 ➜ 提供重新啟用 */}
              {selectedSpot.status === 'disabled' && (
                <Tooltip content="解除該車位的故障維修狀態，重新啟用為正常的可用空位。">
                  <button
                    disabled={actionProcessing}
                    onClick={handleModalEnable}
                    className="w-full py-3 bg-[#10B981] hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCcw size={14} />
                    {t('spot.action_enable')}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
