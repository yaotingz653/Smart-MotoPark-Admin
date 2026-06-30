import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Trash2, Send, ShieldAlert, Sparkles, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommunityMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  role: 'student' | 'ai' | 'admin';
  content: string;
  created_at: string;
}

/**
 * 社群管理中心頁面
 * - 管理員可即時查看學生端聊天室訊息
 * - 支援刪除訊息、管理員回覆
 * - 具備關鍵字智慧通報（偵測車位亂停事件）
 */
export default function CommunityManager() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 取得最新 100 筆對話記錄
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data as CommunityMessage[]);
    }
    setLoading(false);
  }, []);

  // 刪除訊息
  const handleDelete = async (id: string) => {
    await supabase.from('community_messages').delete().eq('id', id);
  };

  // 發送回覆
  const handleSend = async () => {
    if (!inputVal.trim() || sending) return;
    setSending(true);
    const newMsg = {
      user_id: 'admin-portal',
      user_name: '系統管理員',
      user_avatar: '',
      role: 'admin' as const,
      content: inputVal.trim(),
    };
    const { error } = await supabase.from('community_messages').insert([newMsg]);
    if (!error) {
      setInputVal('');
    }
    setSending(false);
  };

  // 監聽 Enter 按鍵
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // 滾動到底部
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初始化載入並註冊 Supabase Realtime 即時連線
  useEffect(() => {
    queueMicrotask(() => {
      fetchMessages();
    });

    const channel = supabase.channel('realtime-community')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, (payload) => {
        setMessages(prev => {
          // 避免重複加入
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as CommunityMessage];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  // 智慧偵測：是否為車位異常通報
  const detectReport = (content: string) => {
    const spotRegex = /([A-Z]-\d{2})/i;
    const match = content.match(spotRegex);
    if (match) {
      const spotNum = match[1].toUpperCase();
      const isAnomaly = /亂停|亂放|沒掃|異常|佔用|搶位|鎖/g.test(content);
      return { spotNum, isAnomaly };
    }
    return null;
  };

  // 統計數據
  const totalCount = messages.length;
  const aiReplyCount = messages.filter(m => m.role === 'ai').length;
  const anomalyReports = messages.filter(m => detectReport(m.content)?.isAnomaly);

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-100px)]">
      {/* 頁首 */}
      <div className="mb-6 flex-shrink-0">
        <span className="text-[10px] font-bold text-[#FF5D2B] tracking-widest uppercase mb-2 block">Moderation Panel</span>
        <h1 className="text-4xl font-serif font-black text-editorial-ink tracking-tight">Community Chat.</h1>
      </div>

      {/* 數據看板 */}
      <div className="grid grid-cols-3 gap-4 mb-6 flex-shrink-0">
        <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <MessageSquare size={20} className="text-[#3B82F6] shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">總對話筆數</p>
            <p className="text-2xl font-serif font-black text-editorial-ink">{totalCount}</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-2xl px-5 py-4 border border-purple-100 flex items-center gap-4">
          <Sparkles size={20} className="text-purple-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">AI 智慧回覆</p>
            <p className="text-2xl font-serif font-black text-purple-600">{aiReplyCount}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-2xl px-5 py-4 border border-amber-100 flex items-center gap-4">
          <ShieldAlert size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">疑似異常通報</p>
            <p className="text-2xl font-serif font-black text-amber-600">{anomalyReports.length}</p>
          </div>
        </div>
      </div>

      {/* 聊天室本體 */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden mb-4">
        {/* 對話記錄流 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
              載入社群留言中...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageSquare size={32} className="opacity-20" />
              <p className="font-bold text-sm">目前聊天室沒有任何訊息</p>
            </div>
          ) : (
            messages.map(msg => {
              const reportInfo = detectReport(msg.content);
              const isSelf = msg.role === 'admin';
              const isAi = msg.role === 'ai';

              // 頭像與樣式設定
              let cardBg = 'bg-slate-100/80 text-slate-800 rounded-3xl rounded-tl-none hover:bg-slate-100 transition-colors';
              let badgeColor = '';
              let badgeText = '';

              if (isSelf) {
                cardBg = 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/10 rounded-3xl rounded-tr-none';
                badgeColor = 'bg-white/20 text-white border border-white/10';
                badgeText = '管理員';
              } else if (isAi) {
                cardBg = 'bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-100/60 shadow-sm rounded-3xl rounded-tl-none hover:shadow-purple-100/50 hover:shadow-md transition-all duration-300';
                badgeColor = 'bg-purple-600 text-white';
                badgeText = 'AI 助理';
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group max-w-2xl ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* 頭像 */}
                  <div className="w-10 h-10 rounded-2xl bg-white overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md border border-slate-200/50 hover:scale-105 transition-transform duration-300">
                    {msg.user_avatar ? (
                      <img src={msg.user_avatar} alt={msg.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-slate-400" />
                    )}
                  </div>

                  {/* 訊息本體 */}
                  <div className="flex flex-col">
                    {/* 名字與時間 */}
                    <div className={`flex items-center gap-2 mb-1.5 text-[11px] ${isSelf ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-500">{msg.user_name}</span>
                      {badgeText && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-widest uppercase ${badgeColor}`}>
                          {badgeText}
                        </span>
                      )}
                      <span className="text-slate-300">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* 泡泡 */}
                    <div className={`p-4 ${cardBg} text-sm relative transition-all duration-200`}>
                      <p className={`leading-relaxed whitespace-pre-wrap ${isSelf ? 'text-white' : 'text-slate-800'}`}>{msg.content}</p>

                      {/* 智慧車位通報小卡 (點擊一鍵導航) */}
                      {reportInfo?.isAnomaly && (
                        <div className={`mt-3 p-3.5 rounded-2xl border text-[11px] font-bold flex items-center justify-between gap-3 shadow-sm ${
                          isSelf 
                            ? 'bg-white/10 border-white/20 text-white' 
                            : 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-800'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className={isSelf ? 'text-white shrink-0' : 'text-amber-600 shrink-0'} />
                            <span>偵測到車位 {reportInfo.spotNum} 有異常亂停通報</span>
                          </div>
                          <button
                            onClick={() => navigate('/spots')}
                            className={`px-2.5 py-1 rounded-xl text-[10px] hover:shadow transition-all shrink-0 active:scale-95 cursor-pointer ${
                              isSelf
                                ? 'bg-white text-blue-600 hover:bg-slate-50'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                            }`}
                          >
                            前往處理
                          </button>
                        </div>
                      )}

                      {/* 垃圾桶刪除按鈕 (僅在滑鼠移入時顯示，避免干擾畫面) */}
                      {!isSelf && (
                        <button
                          onClick={() => void handleDelete(msg.id)}
                          title="刪除此留言"
                          className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm border border-red-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* 發送輸入區 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <input
            type="text"
            placeholder="輸入管理員官方回覆... (按 Enter 即可送出)"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold tracking-wide outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !inputVal.trim()}
            className="px-4 py-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
          >
            <Send size={14} />
            <span className="text-xs font-bold">發送</span>
          </button>
        </div>
      </div>
    </div>
  );
}
