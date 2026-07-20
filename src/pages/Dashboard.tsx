import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, UserCheck, AlertTriangle, ArrowRight, Ban, HelpCircle } from 'lucide-react';
import type { GridContext } from '../types/grid';

// ─── 輕量級精美 Tooltip 元件 ───────────────────────────────────────────
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <span 
      className="relative inline-flex items-center cursor-help ml-1 text-slate-300 hover:text-slate-500" 
      onMouseEnter={() => setVisible(true)} 
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-bold rounded-xl shadow-xl z-[999] text-center leading-normal animate-fadeIn normal-case select-none pointer-events-none notranslate" translate="no">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

// ─── SVG 圓環佔用率圖表組件 ───────────────────────────────────────────
function DonutChart({ available, occupied, total, t }: { available: number; occupied: number; total: number; t: (key: string) => string }) {
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
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('dash.occupancy_chart')}</h3>
      <div className="relative flex items-center justify-center w-[170px] h-[170px]">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="85"
            cy="85"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
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
        <div className="absolute text-center select-none notranslate" translate="no">
          <span className="text-4xl font-serif font-black text-editorial-ink leading-none">{rate}%</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('dash.occupancy_rate')}</p>
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none notranslate" translate="no">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span>{t('dash.legend_available')} <span>{available}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span>{t('dash.legend_occupied')} <span>{occupied}</span></span>
        </div>
        {disabled > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>{t('dash.legend_disabled')} <span>{disabled}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SVG 歷史佔用率趨勢折線圖組件 ───────────────────────────────────────
function TrendChart({ currentRate, t }: { currentRate: number; t: (key: string) => string }) {
  const [tab, setTab] = useState<'today' | 'weekly'>('today');

  const todayData = [15, 30, 48, 65, 78, 85, 55, Math.max(5, Math.round(currentRate))];
  const todayLabels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  const weeklyData = [65, 70, 78, 82, Math.max(5, Math.round(currentRate)), 25, 15];
  const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const data = tab === 'today' ? todayData : weeklyData;
  const labels = tab === 'today' ? todayLabels : weeklyLabels;

  const width = 500;
  const height = 150;
  const padding = 30;

  const points = data.map((val, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - (val * (height - padding * 2)) / 100;
    return { x, y, val };
  });

  const linePath = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div
      className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-sm hover-glow flex flex-col cursor-default"
      style={{ '--glow-color': 'rgba(139, 92, 246, 0.08)' } as React.CSSProperties}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('trend.title')}</h3>
          <p className="text-[9px] text-slate-300 font-medium mt-0.5">即時演算與歷史峰值統計</p>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-xl notranslate" translate="no">
          <button
            onClick={() => setTab('today')}
            className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${
              tab === 'today' ? 'bg-white text-editorial-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('trend.today')}
          </button>
          <button
            onClick={() => setTab('weekly')}
            className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${
              tab === 'weekly' ? 'bg-white text-editorial-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('trend.weekly')}
          </button>
        </div>
      </div>

      <div className="relative w-full h-[170px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map(yVal => {
            const y = height - padding - (yVal * (height - padding * 2)) / 100;
            return (
              <g key={yVal}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 3} textAnchor="end" className="text-[8px] fill-slate-300 font-sans font-bold notranslate">{yVal}%</text>
              </g>
            );
          })}

          {points.length > 0 && (
            <path d={areaPath} fill="url(#chartAreaGradient)" />
          )}

          {points.length > 0 && (
            <path d={linePath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {points.map((p, idx) => (
            <g key={idx} className="group/dot">
              <circle cx={p.x} cy={p.y} r="4" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1.5" className="transition-all hover:r-6 cursor-pointer" />
              <circle cx={p.x} cy={p.y} r="8" fill="#8B5CF6" fillOpacity="0" className="cursor-pointer" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-300 pointer-events-none notranslate">
                <rect x={p.x - 18} y={p.y - 20} width="36" height="14" rx="4" fill="#1E293B" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[8px] fill-white font-sans font-bold">{p.val}%</text>
              </g>
            </g>
          ))}

          {labels.map((lbl, idx) => {
            const x = padding + (idx * (width - padding * 2)) / (labels.length - 1);
            return (
              <text key={lbl} x={x} y={height - 8} textAnchor="middle" className="text-[8px] fill-slate-400 font-sans font-bold notranslate">{lbl}</text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── 新手管理員引導任務面板組件 ─────────────────────────────────────────
function OnboardingPanel({ anomalyCount, messageCount, t }: { anomalyCount: number; messageCount: number; t: (key: string, replacements?: any) => string }) {
  const navigate = useNavigate();

  const tasks = [
    { id: 1, text: t('onboard.task1'), isCompleted: true, detail: t('onboard.task1_sub') },
    { id: 2, text: t('onboard.task2'), isCompleted: anomalyCount === 0, detail: t('onboard.task2_sub', { count: anomalyCount }), actionText: t('onboard.task2_action'), link: '/spots?guide=troubleshoot' },
    { id: 3, text: t('onboard.task3'), isCompleted: messageCount === 0, detail: t('onboard.task3_sub', { count: messageCount }), actionText: t('onboard.task3_action'), link: '/community' },
    { id: 4, text: t('onboard.task4'), isCompleted: false, detail: t('onboard.task4_sub'), actionText: t('onboard.task4_action'), link: '/grid' }
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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('onboard.title')}</h3>
          <p className="text-[9px] text-slate-300 font-medium mt-0.5">{t('onboard.subtitle')}</p>
        </div>
        <span className="text-xs font-serif font-black text-[#FF5D2B] bg-orange-50 px-2.5 py-1 rounded-full notranslate" translate="no">
          {progressRate}%
        </span>
      </div>

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-[#FF5D2B] transition-all duration-500 rounded-full"
          style={{ width: `${progressRate}%` }}
        />
      </div>

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
  const { t, vehicleType, setVehicleType } = context;
  const arrays = context?.arrays;

  const [stats, setStats] = useState({
    // 機車 (Motorcycle)
    motoTotal: 575, // 固定為 575
    motoAvailable: 0,
    motoOccupied: 0,
    motoDisabled: 0,

    // 汽車 (Car)
    carTotal: 0,
    carAvailable: 0,
    carOccupied: 0,
    carDisabled: 0,

    // 合計
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    disabledSpots: 0,
    totalUsers: 0,
    totalMessages: 0,
  });

  // 新手引導 Tour 步驟狀態：0 (Step 1), 1 (Step 2), 2 (Step 3), null (無)
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    // 檢查 localStorage，若未看過導覽，則啟動引導步驟 0
    const hasSeen = localStorage.getItem('has_seen_dashboard_tour');
    if (!hasSeen) {
      setTourStep(0);
    }

    // 監聽全域事件（用於幫助按鈕觸發）
    const handleStartTour = () => {
      setTourStep(0);
    };
    window.addEventListener('start-onboarding-tour', handleStartTour);
    return () => window.removeEventListener('start-onboarding-tour', handleStartTour);
  }, []);

  const handleNextTour = () => {
    if (tourStep === null) return;
    if (tourStep < 2) {
      setTourStep(tourStep + 1);
    } else {
      localStorage.setItem('has_seen_dashboard_tour', 'true');
      setTourStep(null);
    }
  };

  const handleSkipTour = () => {
    localStorage.setItem('has_seen_dashboard_tour', 'true');
    setTourStep(null);
  };

  const fetchStats = useCallback(async () => {
    try {
      const [motoSpotsRes, carSpotsRes, usersRes, msgsRes] = await Promise.all([
        supabase.from('parking_spots').select('status'),
        supabase.from('car_parking_spots').select('status'),
        supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
        supabase.from('community_messages').select('id'),
      ]);

      if (motoSpotsRes.error) console.error('抓取機車統計資料失敗：', motoSpotsRes.error);
      if (carSpotsRes.error) console.error('抓取汽車統計資料失敗：', carSpotsRes.error);

      const motoSpots = motoSpotsRes.data || [];
      const carSpots = carSpotsRes.data || [];

      // 1. 機車計算 (固定總數 575)
      const motoOccupied = motoSpots.filter(s => s.status === 'occupied' || s.status === 'mine').length;
      const motoDisabled = motoSpots.filter(s => s.status === 'disabled').length;
      const motoAvailable = Math.max(0, 575 - motoOccupied - motoDisabled);

      // 2. 汽車計算 (根據資料表實際長度)
      const carTotal = carSpots.length;
      const carOccupied = carSpots.filter(s => s.status === 'occupied' || s.status === 'mine').length;
      const carDisabled = carSpots.filter(s => s.status === 'disabled').length;
      const carAvailable = Math.max(0, carTotal - carOccupied - carDisabled);

      setStats({
        motoTotal: 575,
        motoAvailable,
        motoOccupied,
        motoDisabled,

        carTotal,
        carAvailable,
        carOccupied,
        carDisabled,

        totalSpots: 575 + carTotal,
        availableSpots: motoAvailable + carAvailable,
        occupiedSpots: motoOccupied + carOccupied,
        disabledSpots: motoDisabled + carDisabled,
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

  const isMoto = vehicleType === 'moto';

  const anomalyCount = isMoto
    ? (stats.motoOccupied + stats.motoDisabled)
    : (stats.carOccupied + stats.carDisabled);

  const currentRate = isMoto
    ? (575 > 0 ? (stats.motoOccupied / 575) * 100 : 0)
    : (stats.carTotal > 0 ? (stats.carOccupied / stats.carTotal) * 100 : 0);

  const statCards = [
    {
      label: isMoto
        ? (context.lang === 'en' ? 'Moto Available' : '機車剩餘空位')
        : (context.lang === 'en' ? 'Car Available' : '汽車剩餘空位'),
      value: isMoto ? stats.motoAvailable : stats.carAvailable,
      sub: isMoto ? `/ 575` : `/ ${stats.carTotal}`,
      color: 'text-[#10B981]',
      bg: 'bg-emerald-50',
      icon: <CheckCircle2 size={22} />,
      iconColor: 'text-[#10B981]',
      glowColor: 'rgba(16, 185, 129, 0.18)',
    },
    {
      label: isMoto
        ? (context.lang === 'en' ? 'Moto Occupied' : '機車已佔用')
        : (context.lang === 'en' ? 'Car Occupied' : '汽車已佔用'),
      value: isMoto ? stats.motoOccupied : stats.carOccupied,
      sub: t('dash.spots_unit'),
      color: 'text-[#EF4444]',
      bg: 'bg-red-50',
      icon: <XCircle size={22} />,
      iconColor: 'text-[#EF4444]',
      glowColor: 'rgba(239, 68, 68, 0.18)',
      tooltip: isMoto
        ? '包含非官方系統的外部佔用機車與學生的正常停車機車位'
        : '包含非官方系統的外部佔用汽車與學生的正常停車汽車位',
    },
    {
      label: isMoto
        ? (context.lang === 'en' ? 'Moto Disabled' : '機車已停用')
        : (context.lang === 'en' ? 'Car Disabled' : '汽車已停用'),
      value: isMoto ? stats.motoDisabled : stats.carDisabled,
      sub: t('dash.spots_unit'),
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      icon: <Ban size={22} />,
      iconColor: 'text-slate-400',
      glowColor: 'rgba(148, 163, 184, 0.15)',
      tooltip: '標記為故障或維修中的停車格，不計入可用空位計算',
    },
    {
      label: t('dash.users'),
      value: stats.totalUsers,
      sub: t('dash.users_sub'),
      color: 'text-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10',
      icon: <UserCheck size={22} />,
      iconColor: 'text-[#3B82F6]',
      glowColor: 'rgba(59, 130, 246, 0.18)',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* 頁面標題 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2 block">{t('dash.subtitle')}</span>
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">{t('dash.title')}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 汽機車一鍵切換膠囊按鈕 */}
          <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
            <button
              onClick={() => setVehicleType('moto')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isMoto
                  ? 'bg-white text-[#8B5CF6] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏍️ {context.lang === 'en' ? 'Motorcycle' : '機車監控'}
            </button>
            <button
              onClick={() => setVehicleType('car')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isMoto
                  ? 'bg-white text-[#8B5CF6] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🚗 {context.lang === 'en' ? 'Car' : '汽車監控'}
            </button>
          </div>

          {/* 手動幫助引導按鈕 */}
          <button
            onClick={() => setTourStep(0)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-2xl text-slate-500 hover:text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <HelpCircle size={15} />
            {context.lang === 'en' ? 'Guide' : '幫助導覽'}
          </button>
        </div>
      </div>

      {/* 兩欄式佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 左欄：統計指標 + SVG 圖表組並排 (Step 1 導覽高亮焦點) */}
        <div className={`lg:col-span-2 space-y-6 transition-all duration-300 ${tourStep === 0 ? 'relative z-50 bg-white/95 rounded-[32px] p-2 ring-[4px] ring-[#8B5CF6] shadow-[0_0_40px_rgba(139,92,246,0.45)]' : ''}`}>
          {/* 四大統計卡片 */}
          <div className="grid grid-cols-2 gap-4">
            {statCards.map(({ label, value, sub, color, bg, icon, iconColor, glowColor, tooltip }) => (
              <div
                key={label}
                className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-sm flex flex-col hover-glow cursor-default relative"
                style={{ '--glow-color': glowColor } as React.CSSProperties}
              >
                <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full ${bg} opacity-20 filter blur-xl pointer-events-none`} />
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center ${iconColor}`}>
                    {icon}
                  </div>
                  <div className="flex items-center">
                    <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] leading-tight">{label}</h3>
                    {tooltip && (
                      <Tooltip content={tooltip}>
                        <HelpCircle size={11} />
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-baseline gap-1.5 relative notranslate" translate="no">
                  <span className={`text-5xl font-serif font-black ${color}`}>{value}</span>
                  <span className="text-base font-bold text-slate-300">{sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SVG 圓環圖 + SVG 歷史趨勢圖 左右並排 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart
              available={isMoto ? stats.motoAvailable : stats.carAvailable}
              occupied={isMoto ? stats.motoOccupied : stats.carOccupied}
              total={isMoto ? 575 : stats.carTotal}
              t={t}
            />
            <TrendChart currentRate={currentRate} t={t} />
          </div>
        </div>

        {/* 右欄：新手任務 + 快速操作入口 */}
        <div className="space-y-6">
          {/* 新手任務引導 (Step 2 導覽高亮焦點) */}
          <div className={`transition-all duration-300 ${tourStep === 1 ? 'relative z-50 bg-white/95 rounded-[32px] p-2 ring-[4px] ring-[#FF5D2B] shadow-[0_0_40px_rgba(255,93,43,0.45)]' : ''}`}>
            <OnboardingPanel anomalyCount={anomalyCount} messageCount={stats.totalMessages} t={t} />
          </div>

          {/* 快速通道入口 */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/spots')}
              className={`text-left p-6 rounded-3xl border-2 transition-all duration-300 group hover-glow cursor-pointer relative ${
                anomalyCount > 0
                  ? 'border-amber-100 bg-amber-500/5 hover:border-amber-300'
                  : 'border-emerald-100 bg-emerald-500/5'
              }`}
              style={{ '--glow-color': anomalyCount > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={anomalyCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                  <div className="flex items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('nav.spots')}</span>
                    <Tooltip content="點擊可立刻查看詳細列表，排查是否有亂停、故障等需要強制釋放的車位。">
                      <HelpCircle size={11} />
                    </Tooltip>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
              {anomalyCount > 0 ? (
                <>
                  <p className="text-2xl font-serif font-black text-amber-600 notranslate" translate="no">
                    <span>{anomalyCount}</span> {t('dash.anomalies_title')}
                  </p>
                  <p className="text-xs text-amber-500 mt-1 notranslate" translate="no">
                    {t('dash.anomalies_sub', { occupied: stats.occupiedSpots, disabled: stats.disabledSpots })}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-serif font-black text-emerald-600">{t('dash.no_anomalies')}</p>
                  <p className="text-xs text-emerald-500 mt-1">{t('dash.no_anomalies_sub')}</p>
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/users')}
              className="text-left p-6 rounded-3xl border border-blue-100/60 bg-blue-500/5 hover:border-blue-300 hover-glow transition-all duration-300 group cursor-pointer"
              style={{ '--glow-color': 'rgba(59, 130, 246, 0.08)' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[#3B82F6]" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('nav.directory')}</span>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-serif font-black text-[#3B82F6] notranslate" translate="no">
                <span>{stats.totalUsers}</span> {t('dash.users')}
              </p>
              <p className="text-xs text-blue-400 mt-1">{t('dash.directory_sub')}</p>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 新手導覽 Overlay 遮罩與指示卡片 ──────────────────────────────────── */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-end p-8 md:justify-center animate-fadeIn pointer-events-none">
          {/* 背景半透明黑色透光遮罩 */}
          <div className="absolute inset-0 bg-slate-950/70 pointer-events-auto backdrop-blur-[2px]" onClick={handleSkipTour} />

          {/* 指示泡泡對話框 */}
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative z-[100] flex flex-col gap-4 pointer-events-auto animate-scaleUp">
            <div>
              <span className="text-[10px] font-extrabold text-[#8B5CF6] uppercase tracking-widest block mb-1">
                新手管理員引導 ({tourStep + 1} / 3)
              </span>
              <h3 className="text-lg font-serif font-black text-editorial-ink">
                {tourStep === 0 && '📊 第一步：即時數據與趨勢監控'}
                {tourStep === 1 && '🎯 第二步：跟隨新手任務指南'}
                {tourStep === 2 && '🌐 第三步：切換多語系避免 Bug'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-bold">
              {tourStep === 0 && '這是您的核心數據儀表板。左側高亮區塊展示了場內當前的可用空位、被佔用數、故障禁用數與歷史趨勢圖表。滑鼠移到折線圖上可以查看過去的數據波動。'}
              {tourStep === 1 && '右側高亮的是新手任務卡片。當場內有亂停或故障車位時，任務卡片會實時更新待辦項目，您可以點選「一鍵排查」快速抵達故障車位進行強制釋放！'}
              {tourStep === 2 && '我們在網頁的左上角（Portal 旁）新增了「EN / 繁中」切換按鈕。系統已原生支援中英雙語，新管理員可以直接點擊切換，無需使用瀏覽器的自動翻譯，進而徹底避免翻譯造成的網頁錯誤與鎖死。'}
            </p>

            {/* 引導步驟按鈕 */}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={handleSkipTour}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                跳過導覽
              </button>
              <button
                onClick={handleNextTour}
                className="px-5 py-2.5 bg-editorial-ink hover:bg-black text-white text-xs font-bold rounded-2xl transition-all active:scale-95 cursor-pointer shadow-md"
              >
                {tourStep === 2 ? '完成導覽' : '下一步'}
              </button>
            </div>
          </div>

          {/* 指向左上角語系切換按鈕的專屬引導標記 (僅在 Step 3 顯示) */}
          {tourStep === 2 && (
            <div className="fixed top-8 left-64 ml-4 bg-[#8B5CF6] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg z-[100] animate-bounce notranslate pointer-events-auto" translate="no">
              ⬅️ 語系切換按鈕在這裡！
            </div>
          )}
        </div>
      )}
    </div>
  );
}
