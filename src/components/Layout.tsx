import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Users, ShieldCheck } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-editorial-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-editorial-ink rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-serif font-black text-lg text-editorial-ink">Admin</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-6 flex flex-col gap-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                isActive ? 'bg-editorial-ink text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-editorial-ink'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </NavLink>
          
          <NavLink
            to="/spots"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                isActive ? 'bg-brand-orange text-white shadow-md shadow-orange-100' : 'text-slate-400 hover:bg-slate-50 hover:text-brand-orange'
              }`
            }
          >
            <Car size={20} />
            <span>Spot Control</span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                isActive ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-[#3B82F6]'
              }`
            }
          >
            <Users size={20} />
            <span>Directory</span>
          </NavLink>
        </nav>



      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-editorial-bg p-8">
        <Outlet />
      </main>
    </div>
  );
}
