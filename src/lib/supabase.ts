import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jtclwgxfqgnvmpuhrimy.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y2x3Z3hmcWdudm1wdWhyaW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTM5MjUsImV4cCI6MjA5MTAyOTkyNX0.pXNa_wzw1ZEKXIW-mTUEf7ja_CR3DRVrXT_GX094hbI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
