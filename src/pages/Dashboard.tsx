import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, UserCheck, AlertTriangle, ArrowRight, Ban } from 'lucide-react';
import type { GridContext } from '../types/grid';

// ─── SVG 圓環佔用率圖表組件 ───────────────────────────────────────────
// ─── SVG 圓環佔用率圖表組件 ───────────────────────────────────────────
function DonutChart({ available, occupied, total }: { available: number; occupied: number; total: number }) {
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const radius = 70;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;
  const disabled = total - available - occupied;

  return (
    <div
      className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-sm hover-glow flex flex-col items-center justify-center relative cursor-default"
      style={{ '--glow-color': 'rgba(139, 92, 246, 0.08)' } as React.CSSProperties}
    >
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">場內佔用率圖表</h3>
      <div className="relative flex items-center justify-center w-[170px] h-[170px]">
        <svg className="w-full h-full transform -rotate-90">
          {/* 背景底圓 */}
          <circle
            cx="85"
            cy="85"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {/* 漸層進度圓 */}
          <circle
            cx="85"
            cy="85"
            r={radius}
            fill="transparent"
            stroke="url(#donutGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: 'drop-shadow(0 0 5px rgba(249, 115, 22, 0.2))' }}
          />
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
        </svg>
        {/* 中央顯示數據 */}
        <div className="absolute text-center select-none notranslate" translate="no">
          <span className="text-4xl font-serif font-black text-editorial-ink leading-none">{rate}%</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">佔用率</p>
        </div>
      </div>

      {/* 圖例說明 */}
      <div className="flex gap-4 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none notranslate" translate="no">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span>空位 <span>{available}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span>佔用 <span>{occupied}</span></span>
        </div>
        {disabled > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>停用 <span>{disabled}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 新手管理員引導任務面板組件 ─────────────────────────────────────────
function OnboardingPanel({ anomalyCount, messageCount }: { anomalyCount: number; messageCount: number }) {
  const navigate = useNavigate();

  const tasks = [
    { id: 1, text: '資料庫即時對接', isCompleted: true, detail: '系統已成功與 Supabase 即時同步狀態' },
    { id: 2, text: '排查場內異常車位', isCompleted: anomalyCount === 0, detail: `目前有 ${anomalyCount} 個車位待處置（亂停或停用）`, actionText: '一鍵排查', link: '/spots' },
    { id: 3, text: '管理社群留言通報', isCompleted: messageCount === 0, detail: `目前有 ${messageCount} 則留言與通報記錄`, actionText: '前往審核', link: '/community' },
    { id: 4, text: '設定停車陣列大小', isCompleted: false, detail: '管理員可自訂車位陣列行列配置', actionText: '開始配置', link: '/grid' }
  ];

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressRate = Math.round((completedCount / tasks.length) * 100);

  return (
    <div
      className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-sm hover-glow flex flex-col cursor-default"
      style={{ '--glow-color': 'rgba(249, 115, 22, 0.05)' } as React.CSSProperties}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">管理新手任務指南</h3>
          <p className="text-[9px] text-slate-300 font-medium mt-0.5">跟隨指引確保場內數據無落差</p>
        </div>
        <span className="text-xs font-serif font-black text-[#FF5D2B] bg-orange-50 px-2.5 py-1 rounded-full">
          {progressRate}%
        </span>
      </div>

      {/* 進度條 */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-[#FF5D2B] transition-all duration-500 rounded-full"
          style={{ width: `${progressRate}%` }}
        />
      </div>

      {/* 任務列表 */}
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.isCompleted}
              readOnly
              className="w-4 h-4 rounded-md border-2 border-slate-200 text-[#FF5D2B] focus:ring-0 focus:ring-offset-0 pointer-events-none mt-0.5 checked:bg-[#FF5D2B] checked:border-transparent transition-colors"
            />
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {task.text}
                </span>
                {task.actionText && !task.isCompleted && (
                  <button
                    onClick={() => navigate(task.link || '/')}
                    className="text-[9px] font-bold text-[#FF5D2B] bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    {task.actionText}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {task.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 主頁面組件 ───────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const context = useOutletContext<GridContext>();
  const arrays = context?.arrays;

  const [stats, setStats] = useState({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    disabledSpots: 0,
    totalUsers: 0,
    totalMessages: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const [motoSpotsRes, carSpotsRes, usersRes, msgsRes] = await Promise.all([
        supabase.from('parking_spots').select('status'),
        supabase.from('car_parking_spots').select('status'),
        supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
        supabase.from('community_messages').select('id'),
      ]);

      if (motoSpotsRes.error) {
        console.error('抓取機車統計資料失敗：', motoSpotsRes.error);
      }
      if (carSpotsRes.error) {
        console.error('抓取汽車統計資料失敗：', carSpotsRes.error);
      }

      const allSpots = [
        ...(motoSpotsRes.data || []),
        ...(carSpotsRes.data || [])
      ];

      setStats({
        totalSpots: allSpots.length,
        availableSpots: allSpots.filter(s => s.status === 'available').length,
        occupiedSpots: allSpots.filter(s => s.status === 'occupied' || s.status === 'mine').length,
        disabledSpots: allSpots.filter(s => s.status === 'disabled').length,
        totalUsers: usersRes.data?.users?.length ?? 0,
        totalMessages: msgsRes.data?.length ?? 0,
      });
    } catch (err) {
      console.error('抓取儀表板統計資料失敗：', err);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStats();
    });
    const sub1 = supabase.channel('spots-dashboard-moto')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, fetchStats)
      .subscribe();
    const sub2 = supabase.channel('spots-dashboard-car')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_parking_spots' }, fetchStats)
      .subscribe();
    return () => { 
      supabase.removeChannel(sub1); 
      supabase.removeChannel(sub2); 
    };
  }, [fetchStats, arrays]);

  const anomalyCount = stats.occupiedSpots + stats.disabledSpots;

  const statCards = [
    {
      label: 'Available Spots',
      value: stats.availableSpots,
      sub: `/ ${stats.totalSpots}`,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      icon: <CheckCircle2 size={22} />,
      iconColor: 'text-[#10B981]',
      glowColor: 'rgba(16, 185, 129, 0.18)',
    },
    {
      label: 'Occupied',
      value: stats.occupiedSpots,
      sub: 'spots',
      color: 'text-[#EF4444]',
      bg: 'bg-red-500/10',
      icon: <XCircle size={22} />,
      iconColor: 'text-[#EF4444]',
      glowColor: 'rgba(239, 68, 68, 0.18)',
    },
    {
      label: 'Disabled',
      value: stats.disabledSpots,
      sub: 'spots',
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      icon: <Ban size={22} />,
      iconColor: 'text-slate-400',
      glowColor: 'rgba(148, 163, 184, 0.18)',
    },
    {
      label: 'Registered Users',
      value: stats.totalUsers,
      sub: 'active',
      color: 'text-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10',
      icon: <UserCheck size={22} />,
      iconColor: 'text-[#3B82F6]',
      glowColor: 'rgba(59, 130, 246, 0.18)',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* 頁首 */}
      <div className="mb-8">
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2 block">Real-time Analytics</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Overview.</h1>
      </div>

      {/* 兩欄式佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左欄：統計指標 + SVG 圓形圖表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 四大統計卡片 */}
          <div className="grid grid-cols-2 gap-4">
            {statCards.map(({ label, value, sub, color, bg, icon, iconColor, glowColor }) => (
              <div
                key={label}
                className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-sm flex flex-col hover-glow cursor-default relative overflow-hidden"
                style={{ '--glow-color': glowColor } as React.CSSProperties}
              >
                {/* 裝飾背景色球 */}
                <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full ${bg} opacity-20 filter blur-xl pointer-events-none`} />
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center ${iconColor}`}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] leading-tight">{label}</h3>
                </div>
                <div className="mt-auto flex items-baseline gap-1.5 relative">
                  <span className={`text-5xl font-serif font-black ${color}`}>{value}</span>
                  <span className="text-base font-bold text-slate-300">{sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SVG Donut Chart */}
          <DonutChart available={stats.availableSpots} occupied={stats.occupiedSpots} total={stats.totalSpots} />
        </div>

        {/* 右欄：新手任務 + 快速操作入口 */}
        <div className="space-y-6">
          {/* 新手任務引導 */}
          <OnboardingPanel anomalyCount={anomalyCount} messageCount={stats.totalMessages} />

          {/* 快速通道入口 */}
          <div className="flex flex-col gap-4">
            {/* 異常車位快速入口 */}
            <button
              onClick={() => navigate('/spots')}
              className={`text-left p-6 rounded-3xl border-2 transition-all duration-300 group hover-glow cursor-pointer ${
                anomalyCount > 0
                  ? 'border-amber-100 bg-amber-500/5 hover:border-amber-300'
                  : 'border-emerald-100 bg-emerald-500/5'
              }`}
              style={{ '--glow-color': anomalyCount > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={anomalyCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Spot Control</span>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
              {anomalyCount > 0 ? (
                <>
                  <p className="text-2xl font-serif font-black text-amber-600 notranslate" translate="no">
                    <span>{anomalyCount}</span> 個車位需要處理
                  </p>
                  <p className="text-xs text-amber-500 mt-1 notranslate" translate="no">
                    包含 <span>{stats.occupiedSpots}</span> 佔用 + <span>{stats.disabledSpots}</span> 停用
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-serif font-black text-emerald-600">所有車位正常</p>
                  <p className="text-xs text-emerald-500 mt-1">目前無需要處理的異常車位</p>
                </>
              )}
            </button>

            {/* 使用者清單快速入口 */}
            <button
              onClick={() => navigate('/users')}
              className="text-left p-6 rounded-3xl border border-blue-100/60 bg-blue-500/5 hover:border-blue-300 hover-glow transition-all duration-300 group cursor-pointer"
              style={{ '--glow-color': 'rgba(59, 130, 246, 0.08)' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[#3B82F6]" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Directory</span>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-serif font-black text-[#3B82F6] notranslate" translate="no">
                <span>{stats.totalUsers}</span> 位已註冊使用者
              </p>
              <p className="text-xs text-blue-400 mt-1">點擊查看完整使用者清單</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
