import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// 優先選用 Service Role Key，若無則降級選用 Anon Key
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少必要的環境變數，請確認 .env 中已設定 VITE_SUPABASE_URL 與 Key');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
