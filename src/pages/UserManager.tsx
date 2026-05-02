import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Car } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plate_number: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // 使用 Service Role Key 直接讀取 auth.users 的完整使用者清單
    const { data } = await supabase.auth.admin.listUsers();
    if (data?.users) {
      const mapped: UserProfile[] = data.users.map(u => ({
        id: u.id,
        name: u.user_metadata?.name || u.email?.split('@')[0] || '—',
        email: u.email || '—',
        plate_number: u.user_metadata?.plate_number || '—',
      }));
      setUsers(mapped);
    }
    setLoading(false);
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase()) ||
    u.plate_number?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10 flex justify-between items-end">
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
            placeholder="Search by name, email or plate..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plate Number</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-slate-400 font-bold text-sm">Loading users...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Search size={32} className="opacity-30" />
                    <p className="font-bold text-sm">No users found.</p>
                    <p className="text-xs">Users will appear here after they sign in to the student app.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(user => (
              <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-editorial-ink">{user.name || '—'}</td>
                <td className="py-4 px-6 text-sm text-slate-500">{user.email || '—'}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-brand-orange" />
                    <span className="font-bold text-editorial-ink tracking-widest uppercase">{user.plate_number || '—'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
