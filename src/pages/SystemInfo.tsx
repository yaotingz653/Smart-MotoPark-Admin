import { Camera, Radio, ShieldCheck } from 'lucide-react';

export default function SystemInfo() {
  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-xs font-bold tracking-[0.24em] uppercase text-sky-500">System guide</p>
      <h1 className="mt-2 text-4xl font-serif font-black text-editorial-ink">系統說明</h1>
      <p className="mt-3 text-slate-500 leading-7">這個管理端協助管理校園機車與汽車停車資訊，並將不同的更新方式清楚分開。</p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-emerald-50 border border-emerald-100 rounded-[28px] p-7"><Radio className="text-emerald-600" size={28} /><h2 className="mt-4 text-xl font-black text-emerald-950">機車：即時車位狀態同步</h2><p className="mt-3 leading-7 text-emerald-900/75">任一使用者點選或預約機車車位後，狀態會寫入 Supabase；其他使用者的畫面會即時同步，不需要重新整理。</p></section>
        <section className="bg-violet-50 border border-violet-100 rounded-[28px] p-7"><Camera className="text-violet-600" size={28} /><h2 className="mt-4 text-xl font-black text-violet-950">汽車：影像辨識監控</h2><p className="mt-3 leading-7 text-violet-900/75">目前使用停車場影像資料集模擬多鏡頭畫面與辨識事件。未來可串接實際攝影機與 Python YOLO 服務。</p></section>
      </div>
      <section className="mt-6 bg-white border border-slate-100 shadow-sm rounded-[28px] p-7"><div className="flex items-center gap-3 text-editorial-ink"><ShieldCheck className="text-sky-500" size={26} /><h2 className="text-xl font-black">展示模式說明</h2></div><p className="mt-3 leading-7 text-slate-600">汽車監控頁的影像目前為資料集展示，不會讀取或保存真實個人車牌資料。學生端只會看到可用車位與停車狀態。</p></section>
    </div>
  );
}
