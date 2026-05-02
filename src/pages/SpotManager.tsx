import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Search } from 'lucide-react';

export default function SpotManager() {
  const [spots, setSpots] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchSpots();
    const sub = supabase.channel('spots-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_spots' }, fetchSpots)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchSpots = async () => {
    const { data } = await supabase.from('parking_spots')
      .select('*')
      .neq('status', 'available')
      .order('id', { ascending: true });
    if (data) setSpots(data);
  };

  const handleForceRelease = async (id: string) => {
    if (!window.confirm(`Are you sure you want to FORCE RELEASE spot ${id}?`)) return;
    await supabase.from('parking_spots').update({
      status: 'available',
      occupied_by: null,
      occupied_at: null
    }).eq('id', id);
  };

  const filtered = spots.filter(s => s.number.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10 flex justify-between items-end">
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
            placeholder="Search occupied spots..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spot ID</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Occupied By</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-bold text-sm">No occupied spots found.</td>
              </tr>
            ) : filtered.map(spot => (
              <tr key={spot.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-editorial-ink">{spot.number}</td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    spot.status === 'mine' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {spot.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-slate-500">{spot.occupied_by || 'Unknown'}</td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => handleForceRelease(spot.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95"
                  >
                    <ShieldAlert size={14} />
                    Force Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
