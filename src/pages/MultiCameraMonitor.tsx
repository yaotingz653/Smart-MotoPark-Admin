import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, CircleDot, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type CameraDevice = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  stream_mode: 'dataset_demo' | 'rtsp';
  last_seen_at: string;
};

type VisionEvent = {
  id: string;
  camera_id: string;
  spot_id: string | null;
  event_type: 'vehicle_detected' | 'spot_occupied' | 'spot_available' | 'entry' | 'exit';
  confidence: number | null;
  detected_at: string;
  image_path: string | null;
};

const fallbackCameras: CameraDevice[] = [
  { id: 'CAR-CAM-01', name: '汽車停車場 A 區全景', location: '露天停車區 A', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
  { id: 'CAR-CAM-02', name: '汽車停車場 B 區全景', location: '露天停車區 B', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
  { id: 'CAR-CAM-03', name: '主顧樓地下停車場入口', location: '主顧樓地下停車場', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
  { id: 'CAR-CAM-04', name: '汽車停車場出口側', location: '出口與臨停區', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
  { id: 'CAR-CAM-05', name: '汽車停車場 C 區', location: '校園停車區 C', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
  { id: 'CAR-CAM-06', name: '汽車停車場 D 區', location: '校園停車區 D', status: 'online', stream_mode: 'dataset_demo', last_seen_at: new Date().toISOString() },
];

const fallbackEvents: VisionEvent[] = [
  { id: 'demo-1', camera_id: 'CAR-CAM-01', spot_id: 'CAR-A-03', event_type: 'spot_occupied', confidence: 96.4, detected_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), image_path: '/monitor/camera-1.webp' },
  { id: 'demo-2', camera_id: 'CAR-CAM-02', spot_id: 'CAR-B-07', event_type: 'vehicle_detected', confidence: 94.1, detected_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), image_path: '/monitor/camera-2.webp' },
  { id: 'demo-3', camera_id: 'CAR-CAM-03', spot_id: 'CAR-B1-02', event_type: 'entry', confidence: 92.8, detected_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(), image_path: '/monitor/camera-3.webp' },
];

const eventLabels: Record<VisionEvent['event_type'], string> = {
  vehicle_detected: '偵測到車輛',
  spot_occupied: '車位已停放',
  spot_available: '車位已釋放',
  entry: '車輛進場',
  exit: '車輛離場',
};

function imageFor(cameraId: string) {
  const number = Number(cameraId.split('-').at(-1)) || 1;
  return `/monitor/camera-${((number - 1) % 6) + 1}.webp`;
}

export default function MultiCameraMonitor() {
  const [cameras, setCameras] = useState<CameraDevice[]>(fallbackCameras);
  const [events, setEvents] = useState<VisionEvent[]>(fallbackEvents);
  const [start, setStart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const loadMonitorData = useCallback(async () => {
    setLoading(true);
    const [cameraResult, eventResult] = await Promise.all([
      supabase.from('camera_devices').select('id,name,location,status,stream_mode,last_seen_at').eq('vehicle_type', 'car').order('id'),
      supabase.from('vision_events').select('id,camera_id,spot_id,event_type,confidence,detected_at,image_path').order('detected_at', { ascending: false }).limit(12),
    ]);

    if (!cameraResult.error && cameraResult.data?.length) setCameras(cameraResult.data as CameraDevice[]);
    if (!eventResult.error && eventResult.data && eventResult.data.length > 0) {
      setEvents(eventResult.data as VisionEvent[]);
    }
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMonitorData();
    const channel = supabase
      .channel('admin-vision-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vision_events' }, loadMonitorData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_devices' }, loadMonitorData)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadMonitorData]);

  const visible = useMemo(() => cameras.slice(start, start + 4), [cameras, start]);
  const canNext = start + 4 < cameras.length;
  const statusText = loading ? '同步中' : `更新於 ${updatedAt.toLocaleTimeString('zh-TW')}`;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-500">Vision intelligence</p>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-serif font-black text-editorial-ink"><Camera className="text-violet-500" /> 汽車影像監控</h1>
          <p className="mt-2 text-sm text-slate-400">展示模式目前使用資料集影像；YOLO 偵測事件與鏡頭狀態由 Supabase 同步。</p>
        </div>
        <button onClick={() => void loadMonitorData()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-editorial-ink px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-black disabled:opacity-60">
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> 重新整理
        </button>
      </header>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="font-serif text-xl font-black text-editorial-ink">汽車鏡頭頻道</h2><p className="mt-1 text-xs text-slate-400">{statusText}・可切換查看其他汽車停車區。</p></div>
          <div className="flex gap-2">
            <button aria-label="上一組鏡頭" onClick={() => setStart(value => Math.max(0, value - 1))} disabled={start === 0} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 disabled:opacity-35"><ChevronLeft size={18} /></button>
            <button aria-label="下一組鏡頭" onClick={() => setStart(value => Math.min(Math.max(0, cameras.length - 4), value + 1))} disabled={!canNext} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 disabled:opacity-35"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((camera) => (
            <article key={camera.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 text-white"><div className="flex items-center gap-2"><CircleDot size={14} className={camera.status === 'online' ? 'animate-pulse text-emerald-400' : 'text-amber-400'} /><span className="text-xs font-bold">{camera.id}</span></div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">{camera.stream_mode === 'rtsp' ? '即時串流' : '資料集模擬'}</span></div>
              <div className="aspect-video bg-slate-900"><img className="h-full w-full object-cover" src={imageFor(camera.id)} alt={`${camera.name} 模擬鏡頭`} /></div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-white"><div className="min-w-0"><p className="truncate text-sm font-bold">{camera.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">{camera.location}</p></div><span className="shrink-0 text-[10px] font-medium text-emerald-300">{camera.status === 'online' ? '連線正常' : camera.status}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-violet-500" /><div><h2 className="font-serif text-xl font-black text-editorial-ink">最近辨識事件</h2><p className="mt-1 text-xs text-slate-400">資料集模擬與未來 YOLO 服務都會寫入這裡。</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="pb-3">時間</th><th className="pb-3">鏡頭</th><th className="pb-3">車位</th><th className="pb-3">事件</th><th className="pb-3">信心度</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{events.length ? events.map((event) => <tr key={event.id}><td className="py-3 text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={13} />{new Date(event.detected_at).toLocaleString('zh-TW')}</span></td><td className="py-3 font-bold text-editorial-ink">{event.camera_id}</td><td className="py-3 text-slate-600">{event.spot_id || '—'}</td><td className="py-3"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{eventLabels[event.event_type]}</span></td><td className="py-3 font-mono text-emerald-600">{event.confidence ? `${event.confidence}%` : '—'}</td></tr>) : <tr><td className="py-8 text-center text-slate-400" colSpan={5}>尚未收到辨識事件</td></tr>}</tbody></table></div>
      </section>

      <p className="rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-xs leading-6 text-violet-700">正式串流時，Python YOLO 服務會將每次辨識事件安全地寫入 Supabase；學生端只讀取車位狀態，機車仍使用動態網格。</p>
    </div>
  );
}
