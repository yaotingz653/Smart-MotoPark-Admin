import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, ShieldCheck, Grid3X3, Plus, MessageSquare, Trash2 } from 'lucide-react';
import type { GridContext } from '../types/grid';
import AddArrayModal from './AddArrayModal';

interface LayoutProps {
  context: GridContext;
}

export default function Layout({ context }: LayoutProps) {
  const { arrays, activeArrayId, setActiveArrayId, addArray, deleteArray } = context;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-editorial-bg">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-200/40 flex flex-col hidden md:flex">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-900/10">
            <ShieldCheck size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="font-serif font-black text-lg text-editorial-ink tracking-wide">Admin</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-6 flex flex-col gap-2 overflow-y-auto">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-editorial-ink text-white shadow-lg shadow-slate-950/20' : 'text-slate-400 hover:bg-slate-100/50 hover:text-editorial-ink'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/spots"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-brand-orange text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-100/50 hover:text-brand-orange'
              }`
            }
          >
            <Car size={20} />
            <span>Spot Control</span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-100/50 hover:text-[#3B82F6]'
              }`
            }
          >
            <Users size={20} />
            <span>Directory</span>
          </NavLink>

          <NavLink
            to="/community"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-[#FF5D2B] text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:bg-slate-100/50 hover:text-[#FF5D2B]'
              }`
            }
          >
            <MessageSquare size={20} />
            <span>Community</span>
          </NavLink>

          <NavLink
            to="/grid"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-[#8B5CF6] text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-100/50 hover:text-[#8B5CF6]'
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

            <div className="flex flex-col gap-1.5">
              {arrays.map(arr => (
                <div key={arr.id} className="relative group/item flex items-center w-full">
                  <button
                    onClick={() => setActiveArrayId(arr.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 ${
                      activeArrayId === arr.id
                        ? 'bg-purple-500/10 text-[#8B5CF6] border border-purple-200/50 shadow-sm pr-10'
                        : 'text-slate-400 hover:bg-slate-100/50 hover:text-slate-700 pr-10'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                      activeArrayId === arr.id ? 'bg-[#8B5CF6] animate-pulse' : 'bg-slate-300'
                    }`} />
                    <span className="truncate pr-4">{arr.name}</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-normal flex-shrink-0 group-hover/item:hidden">
                      {arr.rows}×{arr.cols}
                    </span>
                  </button>

                  {/* 🗑️ 刪除按鈕 — 主停車場不允許刪除 */}
                  {arr.id !== 'array-default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`您確定要刪除「${arr.name}」陣列嗎？\n這將會連同 Supabase 資料庫中的所有車位一併刪除，且無法還原！`)) {
                          deleteArray?.(arr.id);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all hidden group-hover/item:block cursor-pointer"
                      title="刪除此陣列並清空資料庫車位"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ➕ 新增陣列按鈕 — 開啟 Modal 而非 window.prompt */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3.5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-purple-500/5 transition-all duration-300 active:scale-95 cursor-pointer"
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
        key={isModalOpen ? 'open' : 'closed'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async (name, rows, cols, dbTable) => {
          await addArray(name, rows, cols, dbTable);
          setIsModalOpen(false);
          navigate('/grid');
        }}
      />
    </div>
  );
}
