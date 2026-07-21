import { useState, useEffect } from 'react';
import { Camera, Video, Activity, Plus, Trash2, Maximize2, ShieldCheck, Zap, Layers, Car, CheckCircle2 } from 'lucide-react';
import type { GridContext } from '../types/grid';

interface CameraDevice {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  status: 'online' | 'offline' | 'warning';
  arrayId: string;
  fps: number;
  resolution: string;
  aiEnabled: boolean;
  type: 'car' | 'moto' | 'entrance';
}

interface RecognitionEvent {
  id: string;
  plate: string;
  spot: string;
  confidence: number;
  time: string;
  type: 'moto' | 'car';
  cameraName: string;
  status: 'entry' | 'exit' | 'parked';
}

const DEFAULT_CAMERAS: CameraDevice[] = [
  {
    id: 'CAM-CAR-01',
    name: '地下 B1 汽車場入口 AI 監控 CAM',
    location: '汽車場 B1 區 · 專用閘門',
    streamUrl: 'http://localhost:3004/monitor',
    status: 'online',
    arrayId: 'CAR',
    fps: 60,
    resolution: '4K',
    aiEnabled: true,
    type: 'car',
  },
  {
    id: 'CAM-CAR-02',
    name: '汽車停車場 A 區全景視訊監控',
    location: '汽車場 A1~A12 區域監視',
    streamUrl: 'http://localhost:3004/monitor',
    status: 'online',
    arrayId: 'CAR',
    fps: 30,
    resolution: '1080p',
    aiEnabled: true,
    type: 'car',
  },
  {
    id: 'CAM-MOTO-01',
    name: '主顧樓機車棚 LPR 車牌辨識鏡頭',
    location: '主顧停車場 · 正門入口',
    streamUrl: 'http://localhost:3004/monitor',
    status: 'online',
    arrayId: 'array-default',
    fps: 30,
    resolution: '1080p',
    aiEnabled: true,
    type: 'moto',
  },
  {
    id: 'CAM-MOTO-02',
    name: '圖莫樓機車停車棚區域 CAM 02',
    location: '圖莫停車場 · 東側閘門',
    streamUrl: 'http://localhost:3004/monitor',
    status: 'online',
    arrayId: 'ARR-TUMO',
    fps: 30,
    resolution: '1080p',
    aiEnabled: true,
    type: 'moto',
  },
];

const INITIAL_EVENTS: RecognitionEvent[] = [
  { id: 'ev-1', plate: 'MY-8888', spot: 'CAR-02', confidence: 99.4, time: '13:02:10', type: 'car', cameraName: '地下 B1 汽車場入口 AI 監控 CAM', status: 'entry' },
  { id: 'ev-2', plate: 'ABC-1234', spot: 'A-05', confidence: 98.4, time: '12:54:10', type: 'moto', cameraName: '主顧樓機車棚 LPR 車牌辨識鏡頭', status: 'parked' },
  { id: 'ev-3', plate: 'CAR-9999', spot: 'CAR-08', confidence: 97.8, time: '12:50:33', type: 'car', cameraName: '汽車停車場 A 區全景視訊監控', status: 'parked' },
  { id: 'ev-4', plate: 'JKL-5678', spot: 'B-12', confidence: 96.8, time: '12:48:05', type: 'moto', cameraName: '圖莫樓機車停車棚區域 CAM 02', status: 'parked' },
];

export default function CameraManager({ context }: { context?: GridContext }) {
  const [cameras, setCameras] = useState<CameraDevice[]>(DEFAULT_CAMERAS);
  const [selectedCamId, setSelectedCamId] = useState<string>('CAM-CAR-01');
  const [filterType, setFilterType] = useState<'all' | 'car' | 'moto'>('all');
  const [events, setEvents] = useState<RecognitionEvent[]>(INITIAL_EVENTS);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'single'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamType, setNewCamType] = useState<'car' | 'moto'>('car');
  const [newCamUrl, setNewCamUrl] = useState('http://localhost:3004/monitor');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // 時間即時更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 模擬即時 AI 車牌與汽車/機車影像辨識
  useEffect(() => {
    const interval = setInterval(() => {
      const carPlates = ['CAR-777', 'BMW-888', 'TES-001', 'BENZ-999', 'AUDI-520'];
      const motoPlates = ['NKG-520', 'TPA-9988', 'MOTO-101', 'KFC-888'];
      
      const isCarEvent = Math.random() > 0.4;
      const plate = isCarEvent 
        ? carPlates[Math.floor(Math.random() * carPlates.length)]
        : motoPlates[Math.floor(Math.random() * motoPlates.length)];
        
      const spot = isCarEvent 
        ? `CAR-0${Math.floor(Math.random() * 9) + 1}`
        : `A-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;

      const activeCams = cameras.filter(c => isCarEvent ? c.type === 'car' : c.type === 'moto');
      const cam = activeCams[Math.floor(Math.random() * activeCams.length)] || cameras[0];

      const newEvent: RecognitionEvent = {
        id: `ev-${Date.now()}`,
        plate,
        spot,
        confidence: Number((96 + Math.random() * 3.9).toFixed(1)),
        time: new Date().toLocaleTimeString(),
        type: isCarEvent ? 'car' : 'moto',
        cameraName: cam?.name || '汽車即時監控 CAM',
        status: Math.random() > 0.5 ? 'parked' : 'entry',
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
    }, 7000);

    return () => clearInterval(interval);
  }, [cameras]);

  const filteredCameras = cameras.filter(c => {
    if (filterType === 'car') return c.type === 'car';
    if (filterType === 'moto') return c.type === 'moto';
    return true;
  });

  const activeCamera = cameras.find(c => c.id === selectedCamId) || filteredCameras[0] || cameras[0];

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName) return;

    const newCam: CameraDevice = {
      id: `CAM-${newCamType.toUpperCase()}-0${cameras.length + 1}`,
      name: newCamName,
      location: newCamLocation || '現場位置未設定',
      streamUrl: newCamUrl || 'http://localhost:3004/monitor',
      status: 'online',
      arrayId: newCamType === 'car' ? 'CAR' : 'array-default',
      fps: 30,
      resolution: '1080p',
      aiEnabled: true,
      type: newCamType,
    };

    setCameras(prev => [...prev, newCam]);
    setSelectedCamId(newCam.id);
    setNewCamName('');
    setNewCamLocation('');
    setIsAddModalOpen(false);
  };

  const handleDeleteCamera = (id: string) => {
    if (confirm('確定要移除此監視器頻道嗎？')) {
      setCameras(prev => prev.filter(c => c.id !== id));
      if (selectedCamId === id && cameras.length > 1) {
        setSelectedCamId(cameras.filter(c => c.id !== id)[0].id);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 頁首與切換 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 animate-pulse">
              ● LIVE STREAMING
            </span>
            <span className="text-xs font-bold text-slate-400">系統即時時間：{currentTime}</span>
          </div>
          <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight flex items-center gap-3">
            <Camera className="text-[#8B5CF6]" size={36} />
            汽車與機車影像監控中心 (CCTV Monitor)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 汽車 / 機車 種類篩選按鈕 */}
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all' ? 'bg-editorial-ink text-white shadow' : 'text-slate-500 hover:text-editorial-ink'
              }`}
            >
              全部 (All)
            </button>
            <button
              onClick={() => setFilterType('car')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterType === 'car' ? 'bg-brand-orange text-white shadow' : 'text-slate-500 hover:text-brand-orange'
              }`}
            >
              <Car size={14} />
              汽車監控 (Car CAM)
            </button>
            <button
              onClick={() => setFilterType('moto')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'moto' ? 'bg-[#3B82F6] text-white shadow' : 'text-slate-500 hover:text-[#3B82F6]'
              }`}
            >
              機車監控 (Moto CAM)
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#8B5CF6] text-white rounded-2xl font-bold text-xs hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            新增鏡頭
          </button>
        </div>
      </div>

      {/* 狀態數據摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">汽車監視鏡頭</p>
            <p className="text-3xl font-serif font-black text-brand-orange">{cameras.filter(c => c.type === 'car').length} 支</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold">
            <Car size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">機車監視鏡頭</p>
            <p className="text-3xl font-serif font-black text-[#3B82F6]">{cameras.filter(c => c.type === 'moto').length} 支</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3B82F6] flex items-center justify-center font-bold">
            <Video size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI 車牌辨識率</p>
            <p className="text-3xl font-serif font-black text-emerald-600">99.2%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">即時辨識事件串流</p>
            <p className="text-3xl font-serif font-black text-[#8B5CF6]">Active</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center font-bold">
            <Zap size={22} />
          </div>
        </div>
      </div>

      {/* 主監控區 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側 CCTV 多視訊牆 (佔 2 欄) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCameras.map(cam => (
              <div
                key={cam.id}
                onClick={() => setSelectedCamId(cam.id)}
                className={`bg-slate-900 rounded-3xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.01] relative group ${
                  selectedCamId === cam.id ? 'border-brand-orange ring-2 ring-orange-500/30 shadow-xl' : 'border-slate-800'
                }`}
              >
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={
                      cam.type === 'car'
                        ? 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=800&auto=format&fit=crop'
                        : 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=800&auto=format&fit=crop'
                    }
                    alt={cam.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity"
                  />

                  {/* 汽車 AI 辨識框 Overlay */}
                  {cam.type === 'car' ? (
                    <div className="absolute top-1/3 left-1/4 w-36 h-24 border-2 border-brand-orange/90 bg-orange-500/10 rounded-lg z-20 flex flex-col justify-between p-1.5 animate-pulse">
                      <span className="text-[9px] font-black bg-brand-orange text-white px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                        <Car size={10} /> 汽車位 CAR-02: 停放中
                      </span>
                      <span className="text-[9px] font-bold bg-black/80 text-yellow-400 px-1 py-0.5 rounded self-end font-mono">MY-8888</span>
                    </div>
                  ) : (
                    <div className="absolute top-1/4 left-1/3 w-28 h-18 border-2 border-emerald-400/90 bg-emerald-500/10 rounded-lg z-20 flex flex-col justify-between p-1.5">
                      <span className="text-[9px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded w-fit">A-01: 空位</span>
                      <span className="text-[8px] font-mono text-emerald-300">CONF: 98.9%</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-white bg-black/70 backdrop-blur px-2.5 py-0.5 rounded-full border border-white/10">
                      {cam.id}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 z-20">
                    <p className="text-xs font-bold text-white truncate max-w-[200px] flex items-center gap-1.5">
                      {cam.type === 'car' && <Car size={13} className="text-brand-orange shrink-0" />}
                      {cam.name}
                    </p>
                    <p className="text-[10px] text-slate-300 font-mono">{cam.location}</p>
                  </div>

                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCamera(cam.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-black/60 rounded-lg transition-all"
                      title="刪除鏡頭"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 鏡頭管理列表卡片 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layers size={14} className="text-[#8B5CF6]" />
              已配置汽車與機車鏡頭頻道
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cameras.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCamId(c.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCamId === c.id
                      ? 'bg-orange-50/60 border-orange-200 text-brand-orange'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      c.type === 'car' ? 'bg-orange-100 text-brand-orange' : 'bg-blue-100 text-[#3B82F6]'
                    }`}>
                      {c.type === 'car' ? <Car size={15} /> : <Video size={15} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500">
                    {c.resolution}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：AI 車牌與影像即時抓拍日誌 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-serif font-black text-lg text-editorial-ink flex items-center gap-2">
                <Zap className="text-brand-orange" size={18} />
                AI Realtime Events
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">汽車/機車車牌即時抓拍</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[580px] pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl border border-slate-100 hover:border-orange-200 bg-slate-50/50 hover:bg-orange-50/30 transition-all flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {ev.type === 'car' && (
                      <span className="p-1 bg-brand-orange/10 text-brand-orange rounded-md">
                        <Car size={12} />
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-editorial-ink text-white font-mono font-black text-xs rounded-lg tracking-wider">
                      {ev.plate}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      格位: <strong className="text-editorial-ink">{ev.spot}</strong>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                    📹 {ev.cameraName}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                    <span>時間: {ev.time}</span>
                    <span className="text-emerald-600 font-mono">Conf: {ev.confidence}%</span>
                  </div>
                </div>

                <span className={`px-2 py-1 rounded-xl text-[10px] font-bold shrink-0 ${
                  ev.status === 'parked'
                    ? 'bg-blue-50 text-[#3B82F6]'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {ev.status === 'parked' ? '入格停放' : '進場辨識'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 新增鏡頭 Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif font-black text-xl text-editorial-ink flex items-center gap-2">
              <Camera size={20} className="text-[#8B5CF6]" />
              新增監視鏡頭頻道
            </h3>

            <form onSubmit={handleAddCamera} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">鏡頭種類</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCamType('car')}
                    className={`py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 ${
                      newCamType === 'car' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Car size={16} /> 汽車監視鏡頭
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCamType('moto')}
                    className={`py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 ${
                      newCamType === 'moto' ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Video size={16} /> 機車監視鏡頭
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">鏡頭名稱</label>
                <input
                  type="text"
                  placeholder="例如: 地下 B2 汽車入口 CAM"
                  value={newCamName}
                  onChange={e => setNewCamName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">安裝地點</label>
                <input
                  type="text"
                  placeholder="例如: 汽車場 A 區入口"
                  value={newCamLocation}
                  onChange={e => setNewCamLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">串流網址 (RTSP / Monitor URL)</label>
                <input
                  type="text"
                  placeholder="http://localhost:3004/monitor"
                  value={newCamUrl}
                  onChange={e => setNewCamUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#8B5CF6] text-white rounded-xl font-bold text-xs hover:bg-purple-700 shadow-md"
                >
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
