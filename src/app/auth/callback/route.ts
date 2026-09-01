import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthNext } from "@/lib/auth";
import { promoteTeacherIfNeeded } from "@/lib/auth-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveAuthNext(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await promoteTeacherIfNeeded(user.id, user.email);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth&next=${encodeURIComponent(next)}`
  );
}
