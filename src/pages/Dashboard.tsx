import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, UserCheck, AlertTriangle, ArrowRight, Ban } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    disabledSpots: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    fetchStats();
    const sub = supabase.channel('spots-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchStats = async () => {
    const [spotsRes, usersRes] = await Promise.all([
      supabase.from('parking_spots').select('status'),
      supabase.auth.admin.listUsers(),
    ]);
    if (spotsRes.data) {
      const spots = spotsRes.data;
      setStats({
        totalSpots: spots.length,
        availableSpots: spots.filter(s => s.status === 'available').length,
        occupiedSpots: spots.filter(s => s.status === 'occupied' || s.status === 'mine').length,
        disabledSpots: spots.filter(s => s.status === 'disabled').length,
        totalUsers: usersRes.data?.users?.length ?? 0,
      });
    }
  };

  const occupancyRate = stats.totalSpots > 0
    ? Math.round((stats.occupiedSpots / stats.totalSpots) * 100)
    : 0;

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
    },
    {
      label: 'Occupied',
      value: stats.occupiedSpots,
      sub: 'spots',
      color: 'text-[#EF4444]',
      bg: 'bg-red-500/10',
      icon: <XCircle size={22} />,
      iconColor: 'text-[#EF4444]',
    },
    {
      label: 'Disabled',
      value: stats.disabledSpots,
      sub: 'spots',
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      icon: <Ban size={22} />,
      iconColor: 'text-slate-400',
    },
    {
      label: 'Registered Users',
      value: stats.totalUsers,
      sub: 'active',
      color: 'text-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10',
      icon: <UserCheck size={22} />,
      iconColor: 'text-[#3B82F6]',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2 block">Real-time Analytics</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Overview.</h1>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, sub, color, bg, icon, iconColor }) => (
          <div key={label} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center ${iconColor}`}>
                {icon}
              </div>
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] leading-tight">{label}</h3>
            </div>
            <div className="mt-auto flex items-baseline gap-1.5">
              <span className={`text-5xl font-serif font-black ${color}`}>{value}</span>
              <span className="text-base font-bold text-slate-300">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 佔用率條 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">整體佔用率</span>
          <span className="text-2xl font-serif font-black text-editorial-ink">{occupancyRate}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#EF4444] transition-all duration-700"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* 快速動作區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 異常車位快速入口 */}
        <button
          onClick={() => navigate('/spots')}
          className={`text-left p-6 rounded-3xl border-2 transition-all group ${
            anomalyCount > 0
              ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className={anomalyCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Spot Control</span>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          {anomalyCount > 0 ? (
            <>
              <p className="text-2xl font-serif font-black text-amber-600">{anomalyCount} 個車位需要處理</p>
              <p className="text-xs text-amber-500 mt-1">包含 {stats.occupiedSpots} 佔用 + {stats.disabledSpots} 停用</p>
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
          className="text-left p-6 rounded-3xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-[#3B82F6]" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Directory</span>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-2xl font-serif font-black text-[#3B82F6]">{stats.totalUsers} 位已註冊使用者</p>
          <p className="text-xs text-blue-400 mt-1">點擊查看完整使用者清單</p>
        </button>
      </div>
    </div>
  );
}
