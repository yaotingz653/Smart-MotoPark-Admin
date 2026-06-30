import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Car, MapPin } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plate_number: string;
  // 目前停車中的車位號碼（若無則為 null）
  parkedAt: string | null;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * 同時取得使用者清單與停車格資料，
   * 透過 occupied_by (UUID) 交叉比對，得知每個使用者目前停在哪格
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, motoSpotsRes, carSpotsRes] = await Promise.all([
        supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
        supabase.from('parking_spots')
          .select('number, occupied_by')
          .in('status', ['mine', 'occupied'])
          .not('occupied_by', 'is', null),
        supabase.from('car_parking_spots')
          .select('number, occupied_by')
          .in('status', ['mine', 'occupied'])
          .not('occupied_by', 'is', null),
      ]);

      // 建立 UUID → 車位號碼的對照表
      const spotByUserId: Record<string, string> = {};
      const motoSpots = motoSpotsRes.data as { number: string; occupied_by: string | null }[] | null;
      const carSpots = carSpotsRes.data as { number: string; occupied_by: string | null }[] | null;

      motoSpots?.forEach(s => {
        if (s.occupied_by) spotByUserId[s.occupied_by] = `機車 · ${s.number}`;
      });
      carSpots?.forEach(s => {
        if (s.occupied_by) spotByUserId[s.occupied_by] = `汽車 · ${s.number}`;
      });

      if (usersRes.data?.users) {
        const mapped: UserProfile[] = usersRes.data.users.map(u => ({
          id: u.id,
          name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || '—',
          email: u.email || '—',
          plate_number: (u.user_metadata?.plate_number as string) || '—',
          parkedAt: spotByUserId[u.id] ?? null,
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error('抓取使用者清單失敗：', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchAll();
    });
  }, [fetchAll]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase()) ||
    u.plate_number?.toLowerCase().includes(query.toLowerCase())
  );

  // 目前停車中的人數
  const parkedCount = users.filter(u => u.parkedAt).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* 頁首 */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold text-[#3B82F6] tracking-widest uppercase mb-2 block">Database</span>
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Directory.</h1>
        </div>
        <div className="relative w-72">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="搜尋姓名、Email 或車牌..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
      </div>

      {/* 使用者統計摘要 */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#3B82F6]">
              <Search size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">已註冊使用者</p>
              <p className="text-2xl font-serif font-black text-editorial-ink">{users.length}</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl px-5 py-4 border border-blue-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#3B82F6]">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">目前停車中</p>
              <p className="text-2xl font-serif font-black text-[#3B82F6]">{parkedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* 資料表 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">姓名</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">車牌</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">停車狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-bold text-sm">載入中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Search size={32} className="opacity-30" />
                    <p className="font-bold text-sm">找不到使用者</p>
                    <p className="text-xs">使用者登入 App 後會自動出現在這裡</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(user => (
              <tr key={user.id} className={`border-b border-slate-50 transition-colors ${user.parkedAt ? 'hover:bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                {/* 姓名 */}
                <td className="py-4 px-6 font-bold text-editorial-ink">{user.name}</td>

                {/* Email */}
                <td className="py-4 px-6 text-sm text-slate-500">{user.email}</td>

                {/* 車牌 */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Car size={13} className="text-brand-orange shrink-0" />
                    <span className={`font-bold tracking-widest uppercase text-sm ${user.plate_number !== '—' ? 'text-editorial-ink' : 'text-slate-300'}`}>
                      {user.plate_number}
                    </span>
                  </div>
                </td>

                {/* 停車狀態：顯示目前停在哪個車位 */}
                <td className="py-4 px-6">
                  {user.parkedAt ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-[#3B82F6] bg-blue-50 px-2.5 py-1 rounded-full">
                        停車中 · {user.parkedAt}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300 font-bold">未停車</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-slate-400 font-bold mt-4">
          共 {filtered.length} 位使用者 {query && `（搜尋「${query}」）`}
        </p>
      )}
    </div>
  );
}
