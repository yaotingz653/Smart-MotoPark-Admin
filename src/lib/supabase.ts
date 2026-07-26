import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少必要的環境變數，請確認 .env 中已設定 VITE_SUPABASE_URL 與 Key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 如果有提供 Service Role Key 則建立具備管理員權限的 Client（可用於呼叫 auth.admin.listUsers()）
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : supabase;

