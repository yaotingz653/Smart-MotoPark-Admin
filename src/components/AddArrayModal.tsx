import { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Grid3X3 } from 'lucide-react';

interface AddArrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, rows: number, cols: number, dbTable: 'parking_spots' | 'car_parking_spots') => void;
}

/**
 * 新增停車陣列的自訂 Modal
 * - 取代原本的 window.prompt，提供完整的表單體驗
 * - 支援自訂名稱、行數、列數、車位類型
 */
export default function AddArrayModal({ isOpen, onClose, onConfirm }: AddArrayModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [dbTable, setDbTable] = useState<'parking_spots' | 'car_parking_spots'>('parking_spots');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 自動聚焦名稱輸入框
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleConfirm = () => {
    if (!name.trim()) {
      setError('請輸入陣列名稱');
      inputRef.current?.focus();
      return;
    }
    onConfirm(name.trim(), rows, cols, dbTable);
    onClose();
  };

  // 按 Esc 關閉、Enter 確認
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') handleConfirm();
  };

  if (!isOpen) return null;

  return (
    // 背景遮罩
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Modal 本體 */}
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
        >
          <X size={16} className="text-slate-500" />
        </button>

        {/* 標題 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Grid3X3 size={18} className="text-[#8B5CF6]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-black text-slate-800">新增停車陣列</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">設定陣列名稱與初始大小</p>
          </div>
        </div>

        {/* 名稱輸入 */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
            陣列名稱 <span className="text-red-400">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="例如：B棟停車場、臨時停車區..."
            className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 font-medium text-slate-700 placeholder:text-slate-300 outline-none transition-all ${
              error ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-[#8B5CF6]'
            }`}
          />
          {error && <p className="text-xs text-red-500 font-bold mt-1.5">{error}</p>}
        </div>

        {/* 車位類型選擇 */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
            車位類型 <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setDbTable('parking_spots')}
              className={`flex-1 py-3 px-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all active:scale-95 cursor-pointer ${
                dbTable === 'parking_spots'
                  ? 'border-[#8B5CF6] bg-purple-50 text-[#8B5CF6]'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <span>機車陣列</span>
            </button>
            <button
              type="button"
              onClick={() => setDbTable('car_parking_spots')}
              className={`flex-1 py-3 px-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all active:scale-95 cursor-pointer ${
                dbTable === 'car_parking_spots'
                  ? 'border-[#8B5CF6] bg-purple-50 text-[#8B5CF6]'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <span>汽車陣列</span>
            </button>
          </div>
        </div>

        {/* 行列數設定 */}
        <div className="mb-8">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
            初始大小
          </label>
          <div className="flex items-center gap-4">
            {/* 行數 */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 mb-2">行數 (Rows)</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRows(r => Math.max(1, r - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-100 hover:text-[#8B5CF6] flex items-center justify-center transition-all active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number" min={1} max={50} value={rows}
                  onChange={e => setRows(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-14 text-center text-lg font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none"
                />
                <button
                  onClick={() => setRows(r => Math.min(50, r + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-100 hover:text-[#8B5CF6] flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <span className="text-2xl font-bold text-slate-300 pt-5">×</span>

            {/* 列數 */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 mb-2">列數 (Cols)</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCols(c => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-100 hover:text-[#8B5CF6] flex items-center justify-center transition-all active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number" min={1} max={50} value={cols}
                  onChange={e => setCols(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-14 text-center text-lg font-serif font-black bg-slate-50 rounded-xl py-2 border-none focus:ring-2 focus:ring-[#8B5CF6] outline-none"
                />
                <button
                  onClick={() => setCols(c => Math.min(50, c + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-100 hover:text-[#8B5CF6] flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 預覽車位數 */}
          <div className="mt-3 text-center">
            <span className="text-xs text-slate-400 font-medium">共 </span>
            <span className="text-sm font-serif font-black text-[#8B5CF6]">{rows * cols}</span>
            <span className="text-xs text-slate-400 font-medium"> 個車位</span>
          </div>
        </div>

        {/* 按鈕區 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-2xl bg-[#8B5CF6] text-white font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 transition-all active:scale-95"
          >
            建立陣列
          </button>
        </div>
      </div>
    </div>
  );
}
