import { useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, CircleDot, RefreshCw } from 'lucide-react';

const cameras = [
  { id: 'CAR-CAM-01', name: '汽車停車場 A 區全景', place: '露天停車區 A', camera: 0 },
  { id: 'CAR-CAM-02', name: '汽車停車場 B 區全景', place: '露天停車區 B', camera: 1 },
  { id: 'CAR-CAM-03', name: '地下停車場入口', place: '主顧樓地下停車場', camera: 2 },
  { id: 'CAR-CAM-04', name: '汽車停車場出口側', place: '出口與臨停區', camera: 3 },
  { id: 'CAR-CAM-05', name: '汽車停車場 C 區', place: '校園停車區 C', camera: 4 },
  { id: 'CAR-CAM-06', name: '汽車停車場 D 區', place: '校園停車區 D', camera: 5 },
];

export default function MultiCameraMonitor() {
  const [version, setVersion] = useState(Date.now());
  const [start, setStart] = useState(0);
  const visible = useMemo(() => cameras.slice(start, start + 4), [start]);
  const canNext = start + 4 < cameras.length;

  const refresh = () => setVersion(Date.now());
  const previous = () => setStart(value => Math.max(0, value - 1));
  const next = () => setStart(value => Math.min(cameras.length - 4, value + 1));

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-500">Vision intelligence</p>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-serif font-black text-editorial-ink"><Camera className="text-violet-500" /> 汽車影像監控</h1>
          <p className="mt-2 text-sm text-slate-400">多鏡頭展示模式：使用你提供的停車場資料集影像模擬各汽車區域。</p>
        </div>
        <button onClick={refresh} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-editorial-ink px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-black">
          <RefreshCw size={17} /> 重新整理畫面
        </button>
      </header>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="font-serif text-xl font-black text-editorial-ink">鏡頭頻道</h2><p className="mt-1 text-xs text-slate-400">可左右切換其他汽車停車區鏡頭。</p></div>
          <div className="flex gap-2">
            <button aria-label="上一組鏡頭" onClick={previous} disabled={start === 0} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 disabled:opacity-35"><ChevronLeft size={18} /></button>
            <button aria-label="下一組鏡頭" onClick={next} disabled={!canNext} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 disabled:opacity-35"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((camera) => (
            <article key={camera.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 text-white"><div className="flex items-center gap-2"><CircleDot size={14} className="animate-pulse text-emerald-400" /><span className="text-xs font-bold">{camera.id}</span></div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">資料集模擬</span></div>
              <div className="aspect-video bg-slate-900"><img className="h-full w-full object-cover" src={`/monitor/camera-${camera.camera + 1}.webp?v=${version}`} alt={`${camera.name} 模擬鏡頭`} /></div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-white"><div className="min-w-0"><p className="truncate text-sm font-bold">{camera.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">{camera.place}</p></div><span className="shrink-0 text-[10px] font-medium text-emerald-300">AI 已啟用</span></div>
            </article>
          ))}
        </div>
      </section>

      <p className="rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-xs leading-6 text-violet-700">展示說明：目前每格使用不同的資料集影像模擬攝影機。這些圖片已隨網站部署到 Vercel；正式上線時再將各鏡頭 RTSP／串流網址替換進來，不會影響機車動態網格。</p>
    </div>
  );
}
