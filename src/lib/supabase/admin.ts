// Node.js 20 lacks native WebSocket which @supabase/supabase-js requires
// for Realtime.  For seed scripts we don't need Realtime, so we polyfill
// with the `ws` package (already a transitive dep of @supabase/realtime-js).
import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "./keys";

if (!(global as Record<string, unknown>).WebSocket && typeof require !== "undefined") {
  try {
    (global as Record<string, unknown>).WebSocket = require("ws");
  } catch {
    /* ws not installed – original error will surface */
  }
}

export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
