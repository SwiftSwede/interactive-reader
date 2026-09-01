"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_NEXT_COOKIE, isEmailOtpKind, resolveAuthNext } from "@/lib/auth";
import { getAppOrigin, promoteTeacherIfNeeded } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: string };

function loginErrorPath(nextPath: string): string {
  return `/login?error=auth&next=${encodeURIComponent(nextPath)}`;
}

function hasExplicitNext(raw: string | null | undefined): boolean {
  const value = raw?.trim() ?? "";
  return value.length > 0 && value !== "/dashboard";
}

async function nextFromRequest(
  rawNext: string | null | undefined
): Promise<string> {
  const origin = await getAppOrigin();
  if (hasExplicitNext(rawNext)) {
    return resolveAuthNext(rawNext, origin);
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
  if (!fromCookie) return "/dashboard";

  try {
    return resolveAuthNext(decodeURIComponent(fromCookie), origin);
  } catch {
    return resolveAuthNext(fromCookie, origin);
  }
}

async function finishLogin(nextPath: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await promoteTeacherIfNeeded(user.id, user.email);
  }
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_NEXT_COOKIE);
  redirect(nextPath);
}

export async function verifyEmailOtp(
  _prev: VerifyOtpResult | null,
  formData: FormData
): Promise<VerifyOtpResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s+/g, "");
  const nextPath = await nextFromRequest(String(formData.get("next") ?? ""));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ese email no se ve bien. Revísalo." };
  }

  if (!/^\d{6,8}$/.test(token)) {
    return {
      ok: false,
      error: "El código son 6 números. Cópialos del email y pégalos aquí.",
    };
  }

  const supabase = await createClient();
  let { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    ({ error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "magiclink",
    }));
  }

  if (error) {
    console.error("verifyEmailOtp failed:", error.message);
    return {
      ok: false,
      error:
        "Ese código no sirvió. Revisa los 6 números, o pide uno nuevo en un minuto.",
    };
  }

  await finishLogin(nextPath);
  return { ok: true };
}

export async function confirmTokenHash(
  formData: FormData
): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "email").trim();
  const type = isEmailOtpKind(typeRaw) ? typeRaw : "email";
  const nextPath = await nextFromRequest(String(formData.get("next") ?? ""));

  if (!tokenHash) {
    redirect(loginErrorPath(nextPath));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("confirmTokenHash failed:", error.message);
    redirect(loginErrorPath(nextPath));
  }

  await finishLogin(nextPath);
}
