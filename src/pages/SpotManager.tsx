import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import type { GridContext } from '../types/grid';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Search, Clock, User, Ban, AlertCircle } from 'lucide-react';
import type { DbSpot } from '../types/grid';

// ─── 人類可讀停車時長 ─────────────────────────────────────────────────
function formatDuration(occupiedAt: string | null): string {
  if (!occupiedAt) return '—';
  const diffMs = Date.now() - new Date(occupiedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}天 ${hours % 24}小時`;
  if (hours > 0) return `${hours}小時 ${mins % 60}分`;
  if (mins > 0) return `${mins} 分鐘`;
  return '剛剛';
}

// ─── 灑花慶祝動畫特效組件 ─────────────────────────────────────────────
function ConfettiEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confettiFall {
          animation-name: confettiFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2.5 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const colors = ['#FF5D2B', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={i}
            className="absolute top-[-20px] rounded-sm animate-confettiFall"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function SpotManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext<GridContext>();
  const { vehicleType } = context;
  const isMoto = vehicleType === 'moto';

  const [spots, setSpots] = useState<(DbSpot & { dbTable: 'parking_spots' | 'car_parking_spots' })[]>([]);
  const [query, setQuery] = useState('');
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  // 是否開啟一鍵排查新手導覽
  const queryParams = new URLSearchParams(location.search);
  const isGuide = queryParams.get('guide') === 'troubleshoot';

  // 慶祝灑花狀態
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchSpots = useCallback(async () => {
    try {
      const [motoRes, carRes] = await Promise.all([
        supabase.from('parking_spots').select('*').neq('status', 'available').order('id', { ascending: true }),
        supabase.from('car_parking_spots').select('*').neq('status', 'available').order('id', { ascending: true }),
      ]);
      const motoData = (motoRes.data || []).map(s => ({ ...s, dbTable: 'parking_spots' as const }));
      const carData = (carRes.data || []).map(s => ({ ...s, dbTable: 'car_parking_spots' as const }));
      const merged = [...motoData, ...carData];
      merged.sort((a, b) => a.id.localeCompare(b.id));
      setSpots(merged);
    } catch (err) {
      console.error('抓取車位管理資料失敗：', err);
    }
  }, []);

  const fetchUserMap = useCallback(async () => {
    const { data } = await supabase.auth.admin.listUsers();
    if (data?.users) {
      const map: Record<string, string> = {};
      data.users.forEach(u => {
        map[u.id] = (u.user_metadata?.name as string) || u.email?.split('@')[0] || '未知使用者';
      });
      setUserMap(map);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchSpots(), fetchUserMap()]);
  }, [fetchSpots, fetchUserMap]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchAll();
    });
    const sub1 = supabase.channel('spots-manager-moto')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, fetchSpots)
      .subscribe();
    const sub2 = supabase.channel('spots-manager-car')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_parking_spots' }, fetchSpots)
      .subscribe();
    return () => {
      supabase.removeChannel(sub1);
      supabase.removeChannel(sub2);
    };
  }, [fetchAll, fetchSpots]);

  const handleForceRelease = useCallback(async (id: string, table: 'parking_spots' | 'car_parking_spots') => {
    setReleasingId(id);
    await supabase.from(table).update({
      status: 'available',
      occupied_by: null,
      occupied_at: null,
    }).eq('id', id);

    setConfirmingId(null);
    setReleasingId(null);
    await fetchSpots();

    if (isGuide) {
      // 觸發灑花特效，並在 3.5 秒後關閉導覽參數
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        navigate('/spots', { replace: true });
      }, 3500);
    }
  }, [fetchSpots, isGuide, navigate]);

  // 先篩選當前模式的車位 (機車為 'parking_spots', 汽車為 'car_parking_spots')
  const currentSpots = spots.filter(s =>
    isMoto ? s.dbTable === 'parking_spots' : s.dbTable === 'car_parking_spots'
  );

  const totalCount = currentSpots.length;
  const occupiedCount = currentSpots.filter(s => s.status === 'occupied' || s.status === 'mine').length;
  const disabledCount = currentSpots.filter(s => s.status === 'disabled').length;

  const filtered = currentSpots.filter(s =>
    s.number.toLowerCase().includes(query.toLowerCase()) ||
    (s.occupied_by ? (userMap[s.occupied_by] || '') : '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* 灑花慶祝效果 */}
      {showConfetti && <ConfettiEffect />}

      {/* 頁首 */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold text-brand-orange tracking-widest uppercase mb-2 block">Administrative Action</span>
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Spot Control.</h1>
        </div>
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="搜尋車位或使用者..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
      </div>

      {/* 新手任務引導橫幅 */}
      {isGuide && (
        <div className="mb-6 p-5 bg-[#FF5D2B]/10 border border-[#FF5D2B]/30 rounded-3xl flex items-center justify-between text-xs font-bold text-[#FF5D2B] animate-pulse shadow-sm">
          <span className="flex items-center gap-2">
            💡 新手任務引導：系統已為您篩選出需處置的車位。請點選列表中第一個高亮車位右側的「強制釋放」進行排查！
          </span>
          <button
            onClick={() => navigate('/spots', { replace: true })}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 text-[10px] font-extrabold transition-all cursor-pointer shrink-0 shadow-sm"
          >
            關閉引導
          </button>
        </div>
      )}

      {/* 快速統計條 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className="bg-white rounded-2xl px-5 py-4 border border-slate-100/60 shadow-sm flex items-center gap-4 hover-glow cursor-default"
          style={{ '--glow-color': 'rgba(245, 158, 11, 0.12)' } as React.CSSProperties}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertCircle size={20} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">需處理</p>
            <p className="text-2xl font-serif font-black text-editorial-ink">{totalCount}</p>
          </div>
        </div>
        <div
          className="bg-white rounded-2xl px-5 py-4 border border-slate-100/60 shadow-sm flex items-center gap-4 hover-glow cursor-default"
          style={{ '--glow-color': 'rgba(239, 68, 68, 0.15)' } as React.CSSProperties}
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
            <ShieldAlert size={20} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">佔用中</p>
            <p className="text-2xl font-serif font-black text-red-500">{occupiedCount}</p>
          </div>
        </div>
        <div
          className="bg-white rounded-2xl px-5 py-4 border border-slate-100/60 shadow-sm flex items-center gap-4 hover-glow cursor-default"
          style={{ '--glow-color': 'rgba(148, 163, 184, 0.12)' } as React.CSSProperties}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
            <Ban size={20} className="text-slate-400 shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">停用</p>
            <p className="text-2xl font-serif font-black text-slate-500">{disabledCount}</p>
          </div>
        </div>
      </div>

      {/* 資料表 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover-glow" style={{ '--glow-color': 'rgba(15, 23, 42, 0.02)' } as React.CSSProperties}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">車位</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">類型</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">狀態</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">使用者</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1"><Clock size={11} />停車時長</div>
              </th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ShieldAlert size={32} className="opacity-20" />
                    <p className="font-bold text-sm">目前沒有需要處理的車位</p>
                    <p className="text-xs">所有車位均為空位狀態</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((spot, index) => {
              const isConfirming = confirmingId === spot.id;
              const isReleasing = releasingId === spot.id;
              const userName = spot.occupied_by
                ? (userMap[spot.occupied_by] || spot.occupied_by.slice(0, 8) + '...')
                : null;

              const statusConfig = {
                mine:     { label: '學生停車', bg: 'bg-blue-100', text: 'text-blue-600' },
                occupied: { label: '佔用中',   bg: 'bg-red-100',  text: 'text-red-600'  },
                disabled: { label: '停用',     bg: 'bg-slate-100', text: 'text-slate-500' },
              }[spot.status as 'mine' | 'occupied' | 'disabled'] ?? { label: spot.status, bg: 'bg-slate-100', text: 'text-slate-500' };

              // 導覽模式下，針對第一個車位進行高亮發光框提示
              const isGuideTarget = isGuide && index === 0;

              return (
                <tr
                  key={spot.id}
                  className={`border-b border-slate-50 transition-all duration-300 ${
                    isConfirming ? 'danger-row-glow border-l-4 border-red-500' : 'hover:bg-slate-50/50'
                  } ${
                    isGuideTarget ? 'ring-2 ring-[#FF5D2B] ring-offset-2 bg-orange-500/5 animate-pulse z-10 relative' : ''
                  }`}
                >
                  {/* 車位號碼 */}
                  <td className="py-4 px-6 font-bold text-editorial-ink font-mono">{spot.number}</td>

                  {/* 車位類型 */}
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      spot.dbTable === 'car_parking_spots' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {spot.dbTable === 'car_parking_spots' ? '汽車' : '機車'}
                    </span>
                  </td>

                  {/* 狀態標籤 */}
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* 使用者 */}
                  <td className="py-4 px-6">
                    {userName ? (
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-bold text-slate-700">{userName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">—</span>
                    )}
                  </td>

                  {/* 停車時長 */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock size={12} className="shrink-0" />
                      {formatDuration(spot.occupied_at)}
                    </div>
                  </td>

                  {/* 操作欄 */}
                  <td className="py-4 px-6 text-right">
                    {isConfirming ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-red-500 mr-1">確認釋放？</span>
                        <button
                          onClick={() => handleForceRelease(spot.id, spot.dbTable)}
                          disabled={isReleasing}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                        >
                          {isReleasing ? '執行中...' : '確認'}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(spot.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                          isGuideTarget
                            ? 'bg-[#FF5D2B] text-white hover:bg-orange-600 scale-105 shadow-orange-500/20'
                            : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        <ShieldAlert size={13} />
                        強制釋放
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 筆數提示 */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-slate-400 font-bold mt-4">
          共 {filtered.length} 筆 {query && `（搜尋「${query}」）`}
        </p>
      )}
    </div>
  );
}
