import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://dxmfbscokibbsewdcmah.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bWZic2Nva2liYnNld2RjbWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDU2ODksImV4cCI6MjA5Nzk4MTY4OX0.VP2kzBhx32l7gJtYllR9-2P4R49bGucEh5SvZyhSjx0";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
