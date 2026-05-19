import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Users, ShieldCheck, Grid3X3, Plus } from 'lucide-react';
import type { GridContext } from '../types/grid';
import AddArrayModal from './AddArrayModal';

interface LayoutProps {
  context: GridContext;
}

export default function Layout({ context }: LayoutProps) {
  const { arrays, activeArrayId, setActiveArrayId, addArray } = context;
  const [isModalOpen, setIsModalOpen] = useState(false);

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

        <nav className="flex-1 p-6 flex flex-col gap-2 overflow-y-auto">
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

          <NavLink
            to="/grid"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                isActive ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-100' : 'text-slate-400 hover:bg-slate-50 hover:text-[#8B5CF6]'
              }`
            }
          >
            <Grid3X3 size={20} />
            <span>Grid Config</span>
          </NavLink>

          {/* 停車陣列切換區塊 */}
          <div className="mt-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-4 mb-2">
              停車陣列
            </p>

            <div className="flex flex-col gap-1">
              {arrays.map(arr => (
                <button
                  key={arr.id}
                  onClick={() => setActiveArrayId(arr.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeArrayId === arr.id
                      ? 'bg-purple-50 text-[#8B5CF6] border border-purple-200'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    activeArrayId === arr.id ? 'bg-[#8B5CF6]' : 'bg-slate-300'
                  }`} />
                  <span className="truncate">{arr.name}</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-normal flex-shrink-0">
                    {arr.rows}×{arr.cols}
                  </span>
                </button>
              ))}
            </div>

            {/* ➕ 新增陣列按鈕 — 開啟 Modal 而非 window.prompt */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-purple-50 transition-all duration-200 active:scale-95"
            >
              <Plus size={15} />
              新增陣列
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-editorial-bg p-8">
        <Outlet />
      </main>

      {/* 新增陣列 Modal */}
      <AddArrayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={(name, rows, cols) => addArray(name, rows, cols)}
      />
    </div>
  );
}
