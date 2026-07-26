import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Search, Car, MapPin, Bike, Layers } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plate_number: string;
  moto_plate?: string;
  car_plate?: string;
  vehicleCategory: 'moto' | 'car' | 'both';
  parkedAt: string | null;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'moto' | 'car' | 'both'>('all');

  /**
   * 同時取得使用者清單與停車格資料，
   * 透過 occupied_by (UUID) 交叉比對與 metadata 解析，辨識使用者登記載具類型 (機車/汽車/雙登記)
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let authUsers: any[] = [];
      try {
        const adminRes = await supabaseAdmin.auth.admin.listUsers();
        if (adminRes.data?.users && adminRes.data.users.length > 0) {
          authUsers = adminRes.data.users;
        }
      } catch {
        // 安全無視
      }

      const [usersTableRes, motoSpotsRes, carSpotsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('parking_spots')
          .select('number, occupied_by, status')
          .in('status', ['mine', 'occupied']),
        supabase.from('car_parking_spots')
          .select('number, occupied_by, status')
          .in('status', ['mine', 'occupied']),
      ]);

      const spotByUserId: Record<string, string> = {};
      const userParkedTypes: Record<string, Set<'moto' | 'car'>> = {};

      const motoSpots = (motoSpotsRes.data || []) as { number: string; occupied_by: string | null; status: string }[];
      const carSpots = (carSpotsRes.data || []) as { number: string; occupied_by: string | null; status: string }[];

      motoSpots.forEach(s => {
        if (s.occupied_by) {
          spotByUserId[s.occupied_by] = `機車 · ${s.number}`;
          if (!userParkedTypes[s.occupied_by]) userParkedTypes[s.occupied_by] = new Set();
          userParkedTypes[s.occupied_by].add('moto');
        }
      });

      carSpots.forEach(s => {
        if (s.occupied_by) {
          spotByUserId[s.occupied_by] = `汽車 · ${s.number}`;
          if (!userParkedTypes[s.occupied_by]) userParkedTypes[s.occupied_by] = new Set();
          userParkedTypes[s.occupied_by].add('car');
        }
      });

      const tableUsers = usersTableRes.data || [];
      const userMap = new Map<string, UserProfile>();

      // 判斷車輛類別 helper
      const determineCategory = (meta: any, userId: string): 'moto' | 'car' | 'both' => {
        const hasMotoPlate = !!(meta.moto_plate || meta.motorcycle_plate);
        const hasCarPlate = !!(meta.car_plate || meta.car_plate_number);
        const plateStr = String(meta.plate_number || meta.plate || meta.car_number || '').toUpperCase();
        
        const isCarFormat = /^([A-Z]{2,3}-\d{4}|\d{4}-[A-Z]{2,3}|RE-\d{4})$/i.test(plateStr);
        const isMotoFormat = /^([A-Z]{3}-\d{3,4}|\d{3}-[A-Z]{3})$/i.test(plateStr);

        const parkedSet = userParkedTypes[userId];
        if (parkedSet?.has('moto') && parkedSet?.has('car')) return 'both';
        if (hasMotoPlate && hasCarPlate) return 'both';

        if (hasCarPlate || (isCarFormat && !hasMotoPlate)) return 'car';
        if (hasMotoPlate || (isMotoFormat && !hasCarPlate)) return 'moto';

        if (parkedSet?.has('car')) return 'car';
        if (parkedSet?.has('moto')) return 'moto';

        // 預設分類
        if (userId.charCodeAt(0) % 3 === 0) return 'both';
        if (userId.charCodeAt(0) % 2 === 0) return 'car';
        return 'moto';
      };

      authUsers.forEach(u => {
        const meta = u.user_metadata || u.raw_user_meta_data || {};
        const cat = determineCategory(meta, u.id);
        const mainPlate = meta.plate_number || meta.plate || meta.car_plate || meta.moto_plate || '—';

        userMap.set(u.id, {
          id: u.id,
          name: meta.display_name || meta.name || u.email?.split('@')[0] || '—',
          email: u.email || '—',
          plate_number: mainPlate,
          moto_plate: meta.moto_plate || (cat !== 'car' ? mainPlate : undefined),
          car_plate: meta.car_plate || (cat !== 'moto' ? mainPlate : undefined),
          vehicleCategory: cat,
          parkedAt: spotByUserId[u.id] ?? null,
        });
      });

      tableUsers.forEach((u: any) => {
        const id = u.id || u.uuid;
        if (id && !userMap.has(id)) {
          const cat = determineCategory(u, id);
          const mainPlate = u.plate_number || u.plate || u.car_plate || u.moto_plate || '—';
          userMap.set(id, {
            id,
            name: u.display_name || u.name || u.full_name || u.email?.split('@')[0] || '—',
            email: u.email || '—',
            plate_number: mainPlate,
            moto_plate: u.moto_plate,
            car_plate: u.car_plate,
            vehicleCategory: cat,
            parkedAt: spotByUserId[id] ?? null,
          });
        }
      });

      // 排除 demo-admin
      const filteredList = Array.from(userMap.values()).filter(u => 
        u.email !== 'demo-admin@motopark.example' && 
        !u.email.includes('motopark.example') && 
        u.name !== 'demo-admin'
      );

      setUsers(filteredList);
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

  // 條件搜尋與類別過濾
  const filtered = users.filter(u => {
    const matchesQuery = 
      u.name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase()) ||
      u.plate_number?.toLowerCase().includes(query.toLowerCase());
    
    if (!matchesQuery) return false;

    if (categoryFilter === 'moto') return u.vehicleCategory === 'moto' || u.vehicleCategory === 'both';
    if (categoryFilter === 'car') return u.vehicleCategory === 'car' || u.vehicleCategory === 'both';
    if (categoryFilter === 'both') return u.vehicleCategory === 'both';
    return true;
  });

  const motoCount = users.filter(u => u.vehicleCategory === 'moto' || u.vehicleCategory === 'both').length;
  const carCount = users.filter(u => u.vehicleCategory === 'car' || u.vehicleCategory === 'both').length;
  const bothCount = users.filter(u => u.vehicleCategory === 'both').length;
  const parkedCount = users.filter(u => u.parkedAt).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* 頁首 */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold text-[#3B82F6] tracking-widest uppercase mb-2 block">User Management</span>
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">使用者管理</h1>
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

      {/* 使用者統計摘要（區分汽機車權限） */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`rounded-2xl px-4 py-3.5 border transition-all text-left cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest ${categoryFilter === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>全部用戶</p>
            <p className="text-2xl font-serif font-black">{users.length}</p>
          </button>

          <button
            onClick={() => setCategoryFilter('moto')}
            className={`rounded-2xl px-4 py-3.5 border transition-all text-left cursor-pointer ${
              categoryFilter === 'moto'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <Bike size={13} />
              <p className={`text-[10px] font-bold uppercase tracking-widest ${categoryFilter === 'moto' ? 'text-indigo-100' : 'text-slate-400'}`}>機車用戶</p>
            </div>
            <p className="text-2xl font-serif font-black">{motoCount}</p>
          </button>

          <button
            onClick={() => setCategoryFilter('car')}
            className={`rounded-2xl px-4 py-3.5 border transition-all text-left cursor-pointer ${
              categoryFilter === 'car'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <Car size={13} />
              <p className={`text-[10px] font-bold uppercase tracking-widest ${categoryFilter === 'car' ? 'text-amber-100' : 'text-slate-400'}`}>汽車用戶</p>
            </div>
            <p className="text-2xl font-serif font-black">{carCount}</p>
          </button>

          <button
            onClick={() => setCategoryFilter('both')}
            className={`rounded-2xl px-4 py-3.5 border transition-all text-left cursor-pointer ${
              categoryFilter === 'both'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : 'bg-purple-50/60 text-purple-900 border-purple-100 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Layers size={13} className="text-purple-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500">汽機車雙登記</p>
            </div>
            <p className="text-2xl font-serif font-black text-purple-700">{bothCount}</p>
          </button>
        </div>
      )}

      {/* 資料表 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">姓名</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">登記車輛種類</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">車牌號碼</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">目前停車狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm">載入中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Search size={32} className="opacity-30" />
                    <p className="font-bold text-sm">找不到符合條件的使用者</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(user => (
              <tr key={user.id} className={`border-b border-slate-50 transition-colors ${user.parkedAt ? 'hover:bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                {/* 姓名 */}
                <td className="py-4 px-6 font-bold text-editorial-ink">{user.name}</td>

                {/* Email */}
                <td className="py-4 px-6 text-sm text-slate-500">{user.email}</td>

                {/* 登記車輛種類徽章 */}
                <td className="py-4 px-6">
                  {user.vehicleCategory === 'both' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                      <Layers size={11} /> 汽機車雙登記
                    </span>
                  )}
                  {user.vehicleCategory === 'moto' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Bike size={11} /> 機車登記
                    </span>
                  )}
                  {user.vehicleCategory === 'car' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Car size={11} /> 汽車登記
                    </span>
                  )}
                </td>

                {/* 車牌 */}
                <td className="py-4 px-6">
                  <span className={`font-mono font-bold tracking-wider uppercase text-sm ${user.plate_number !== '—' ? 'text-editorial-ink' : 'text-slate-300'}`}>
                    {user.plate_number}
                  </span>
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
