import { createClient } from '@supabase/supabase-js';

// NOTE: 金鑰從環境變數讀取，避免敏感資訊暴露於原始碼
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Service Role Key — 管理員後台專用，可繞過 RLS 讀取所有資料
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 開發時提前警告，避免無聲失敗
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少必要的環境變數，請確認 .env 檔案已正確設定（參考 .env.example）');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey);
