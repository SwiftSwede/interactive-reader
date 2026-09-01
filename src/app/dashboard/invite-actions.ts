"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authConfirmRedirectTo } from "@/lib/auth";
import { getAppOrigin, requireTeacher } from "@/lib/auth-server";

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
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.role === "teacher") {
    return {
      ok: false,
      error: "Ese email es de un profe. No lo puedo meter como estudiante.",
    };
  }

  if (existingProfile) {
    await setClassroomProfile(existingProfile.id, email);
    await updateDisplayName(existingProfile.id, displayName);

    const { error: otpError } = await admin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    revalidatePath("/dashboard");

    if (otpError) {
      return {
        ok: true,
        message: `${displayName} ya está en el grupo. Si no les llega el email, que entren por /login.`,
      };
    }

    return {
      ok: true,
      message:
        existingProfile.role === "student-classroom"
          ? `Listo. Le volví a mandar el link a ${displayName}.`
          : `Listo. ${displayName} ahora es estudiante de clase. Les mandé un link.`,
    };
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
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!racedProfile) {
      return {
        ok: false,
        error:
          "Esa cuenta ya existe pero no la pude encontrar. Diles que entren por /login.",
      };
    }

    await setClassroomProfile(racedProfile.id, email);
    await updateDisplayName(racedProfile.id, displayName);
    await admin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: `Listo. ${displayName} ya tenía cuenta. Les mandé un link.`,
    };
  }

  await setClassroomProfile(created.user.id, email);

  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  revalidatePath("/dashboard");

  if (otpError) {
    return {
      ok: true,
      message: `${displayName} ya está en el grupo. Si no les llega el email, que entren por /login.`,
    };
  }

  return {
    ok: true,
    message: `Listo. Le mandé un link a ${displayName}. Cuando lo abra, ya está adentro.`,
  };
}
