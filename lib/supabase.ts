import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing Supabase URL. Please set EXPO_PUBLIC_SUPABASE_URL in your environment variables.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "Missing Supabase Key. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
