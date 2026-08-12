import { createClient } from "@supabase/supabase-js";

// Supabase client — uses environment variables
// In development: .env.local
// In production: Vercel environment variables

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In development, warn but don't crash (allows UI work without DB)
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "Supabase environment variables not set. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;