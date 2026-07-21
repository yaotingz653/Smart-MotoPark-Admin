import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Car, Clock3, Eye, RefreshCw, ShieldCheck, SquareParking } from 'lucide-react';

type MonitorStatus = {
  source: string;
  camera_name: string;
  image_name: string;
  updated_at: number;
  detections: { Car?: number; Spot?: number; Plate?: number };
  note: string;
};

const apiBase = import.meta.env.VITE_VISION_API_BASE_URL || 'http://localhost:8000';

export default function VisionMonitor() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameVersion, setFrameVersion] = useState(Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/monitor/status`);
      if (!response.ok) throw new Error('影像服務沒有回應');
      const nextStatus = await response.json() as MonitorStatus;
      setStatus(nextStatus);
      setFrameVersion(Date.now());
      setError(null);
    } catch {
      setError('無法連線到本機影像服務。請確認監控服務正在執行。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const updatedTime = status ? new Date(status.updated_at * 1000).toLocaleTimeString('zh-TW') : '--';

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.22em] text-violet-500 uppercase">Vision intelligence</p>
          <h1 className="mt-1 text-4xl font-serif font-black text-editorial-ink">影像監控</h1>
          <p className="mt-2 text-sm text-slate-400">使用 YOLO 模型辨識車輛、停車格與車牌。</p>
        </div>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-editorial-ink px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-black disabled:opacity-60">
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          立即更新
        </button>
      </header>

      {error ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-800">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5" /><div><h2 className="font-bold">影像服務尚未連線</h2><p className="mt-1 text-sm">{error}</p><p className="mt-3 text-xs text-amber-700">展示模式需要本機服務運行於 http://localhost:8000。</p></div></div>
        </section>
      ) : (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-slate-950 shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /><span className="text-sm font-bold">{status?.camera_name ?? '連線中'}</span></div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wider">資料集展示</span>
            </div>
            <div className="relative aspect-video bg-slate-900">
              {status && <img src={`${apiBase}/api/monitor/frame?v=${frameVersion}`} alt="停車場 AI 辨識畫面" className="h-full w-full object-contain" />}
              {!status && <div className="flex h-full items-center justify-center text-sm text-slate-400">正在載入辨識畫面…</div>}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-xs text-slate-300"><span>來源：{status?.source ?? '--'}</span><span className="flex items-center gap-1"><Clock3 size={13} />最後更新：{updatedTime}</span><span className="truncate">{status?.image_name}</span></div>
          </section>

          <aside className="space-y-4">
            <Metric icon={<Car size={20} />} label="偵測車輛" value={status?.detections.Car ?? 0} color="text-orange-500" bg="bg-orange-50" />
            <Metric icon={<SquareParking size={20} />} label="偵測停車格" value={status?.detections.Spot ?? 0} color="text-emerald-500" bg="bg-emerald-50" />
            <Metric icon={<Eye size={20} />} label="偵測車牌" value={status?.detections.Plate ?? 0} color="text-blue-500" bg="bg-blue-50" />
            <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5"><div className="flex items-center gap-2 text-violet-700"><ShieldCheck size={19} /><span className="text-sm font-bold">展示模式安全提示</span></div><p className="mt-3 text-xs leading-6 text-violet-700">{status?.note ?? '等待影像服務回傳資料。'}</p></div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, color, bg }: { icon: ReactNode; label: string; value: number; color: string; bg: string }) {
  return <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-2xl p-3 ${bg} ${color}`}>{icon}</div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-4xl font-serif font-black ${color}`}>{value}</p></div>;
}
