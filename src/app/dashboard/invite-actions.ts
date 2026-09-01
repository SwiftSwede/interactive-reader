"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authConfirmRedirectTo } from "@/lib/auth";
import { getAppOrigin, requireTeacher } from "@/lib/auth-server";
import {
  inviteOtpErrorMessage,
  wasRemovedFromClassroom,
} from "@/lib/invite-student";

export type InviteStudentResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function setClassroomProfile(
  userId: string,
  email: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      role: "student-classroom",
      subscription_status: "active",
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { display_name: displayName },
  });
}

async function sendInviteOtp(
  email: string,
  redirectTo: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  return error?.message ?? null;
}

export async function inviteStudent(
  _prev: InviteStudentResult | null,
  formData: FormData
): Promise<InviteStudentResult> {
  try {
    return await inviteStudentInner(formData);
  } catch (error) {
    console.error("inviteStudent failed:", error);
    return {
      ok: false,
      error: "Algo salió mal. Inténtalo de nuevo en un momento.",
    };
  }
}

async function inviteExistingStudent(params: {
  userId: string;
  email: string;
  displayName: string;
  redirectTo: string;
  subscriptionStatus: string | null | undefined;
  role: string | null | undefined;
}): Promise<InviteStudentResult> {
  const removed = wasRemovedFromClassroom(params.subscriptionStatus);
  const otpError = await sendInviteOtp(params.email, params.redirectTo);

  await setClassroomProfile(params.userId, params.email);
  await updateDisplayName(params.userId, params.displayName);
  revalidatePath("/dashboard");

  if (otpError) {
    if (removed) {
      return {
        ok: true,
        message: `Listo. ${params.displayName} vuelve al grupo. El email no salió: que pidan el código en /login.`,
      };
    }
    return { ok: false, error: inviteOtpErrorMessage(otpError) };
  }

  if (removed) {
    return {
      ok: true,
      message: `Listo. ${params.displayName} vuelve al grupo. Les mandé un código.`,
    };
  }

  if (params.role === "student-classroom") {
    return {
      ok: true,
      message: `Listo. Le volví a mandar el código a ${params.displayName}.`,
    };
  }

  return {
    ok: true,
    message: `Listo. ${params.displayName} ahora es estudiante de clase. Les mandé un código.`,
  };
}

async function inviteStudentInner(
  formData: FormData
): Promise<InviteStudentResult> {
  await requireTeacher();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!isValidEmail(email)) {
    return { ok: false, error: "Ese email no se ve bien. Revísalo." };
  }

  if (!displayName) {
    return {
      ok: false,
      error: "Pon cómo los llamas en clase. Algo como Sofia G.",
    };
  }

  // Invite emails from inviteUserByEmail skip PKCE and break /auth/callback.
  // Create the user, set classroom role, then send the same OTP email as /login.
  const origin = await getAppOrigin();
  const redirectTo = authConfirmRedirectTo(origin, "/dashboard");
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, subscription_status")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.role === "teacher") {
    return {
      ok: false,
      error: "Ese email es de un profe. No lo puedo meter como estudiante.",
    };
  }

  if (existingProfile) {
    return inviteExistingStudent({
      userId: existingProfile.id,
      email,
      displayName,
      redirectTo,
      subscriptionStatus: existingProfile.subscription_status,
      role: existingProfile.role,
    });
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

  if (createError || !created.user) {
    const alreadyExists =
      createError?.message?.toLowerCase().includes("already") ?? false;
    if (!alreadyExists) {
      return {
        ok: false,
        error:
          "No pude crear la cuenta. Revisa el email e inténtalo de nuevo.",
      };
    }

    const { data: racedProfile } = await admin
      .from("profiles")
      .select("id, role, subscription_status")
      .eq("email", email)
      .maybeSingle();

    if (!racedProfile) {
      return {
        ok: false,
        error:
          "Esa cuenta ya existe pero no la pude encontrar. Diles que entren por /login.",
      };
    }

    return inviteExistingStudent({
      userId: racedProfile.id,
      email,
      displayName,
      redirectTo,
      subscriptionStatus: racedProfile.subscription_status,
      role: racedProfile.role,
    });
  }

  const otpError = await sendInviteOtp(email, redirectTo);
  if (otpError) {
    return { ok: false, error: inviteOtpErrorMessage(otpError) };
  }

  await setClassroomProfile(created.user.id, email);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Listo. Le mandé un código a ${displayName}. Cuando lo abra, ya está adentro.`,
  };
}
