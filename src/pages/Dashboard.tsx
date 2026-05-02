import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, UserCheck } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSpots: 552,
    availableSpots: 0,
    occupiedSpots: 0,
    totalUsers: 0
  });

  useEffect(() => {
    fetchStats();
    
    // Subscribe to changes
    const spotsSub = supabase.channel('spots-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(spotsSub);
    };
  }, []);

  const fetchStats = async () => {
    const [spotsRes, usersRes] = await Promise.all([
      supabase.from('parking_spots').select('status'),
      supabase.auth.admin.listUsers()
    ]);
    if (spotsRes.data) {
      const spots = spotsRes.data;
      const available = spots.filter(s => s.status === 'available').length;
      const occupied = spots.filter(s => s.status === 'occupied' || s.status === 'mine').length;
      setStats({
        totalSpots: spots.length,
        availableSpots: available,
        occupiedSpots: occupied,
        totalUsers: usersRes.data?.users?.length ?? 0
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2 block">Real-time Analytics</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Overview.</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Spots Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Available Spots</h3>
          </div>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-6xl font-serif font-black text-[#10B981]">{stats.availableSpots}</span>
            <span className="text-xl font-bold text-slate-300">/ {stats.totalSpots}</span>
          </div>
        </div>

        {/* Occupied Spots Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle size={24} />
            </div>
            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Occupied</h3>
          </div>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-6xl font-serif font-black text-red-500">{stats.occupiedSpots}</span>
            <span className="text-xl font-bold text-slate-300">spots</span>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
              <UserCheck size={24} />
            </div>
            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Registered Users</h3>
          </div>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-6xl font-serif font-black text-[#3B82F6]">{stats.totalUsers}</span>
            <span className="text-xl font-bold text-slate-300">active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
