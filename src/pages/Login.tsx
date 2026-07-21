import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) { setError('登入失敗，請確認帳號與密碼。'); return; }
    navigate('/dashboard', { replace: true });
  };
  return <main className="min-h-screen bg-editorial-bg flex items-center justify-center p-5"><section className="w-full max-w-md rounded-[30px] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-900/10"><div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-editorial-ink text-white"><Shield size={32} /></div><h1 className="text-center text-3xl font-serif font-black text-editorial-ink">管理端登入</h1><p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Smart MotoPark Admin</p>{error && <p className="mt-6 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600"><AlertCircle size={18} />{error}</p>}<form onSubmit={handleLogin} className="mt-7 space-y-5"><label className="block text-xs font-bold text-slate-500">電子信箱<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 outline-none ring-editorial-ink focus:ring-2" placeholder="admin@example.com" /></label><label className="block text-xs font-bold text-slate-500">密碼<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 outline-none ring-editorial-ink focus:ring-2" placeholder="輸入密碼" /></label><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-editorial-ink py-3 font-bold text-white transition hover:bg-black disabled:opacity-60"><Lock size={16} />{loading ? '登入中…' : '登入'}</button></form></section></main>;
}
