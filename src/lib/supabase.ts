import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mlxkzuceamdekinwthyg.supabase.co';
// Service Role Key — 管理員後台專用，可繞過 RLS 讀取所有資料
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1seGt6dWNlYW1kZWtpbnd0aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4NDY4OSwiZXhwIjoyMDkyMzYwNjg5fQ.cLaiKc1okymN66vWDozFmf2SkL-nxBC8HOcrcW5IUvo';

export const supabase = createClient(supabaseUrl, serviceRoleKey);
