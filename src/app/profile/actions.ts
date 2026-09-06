"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateDisplayNameResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MAX_NAME = 50;

export async function updateDisplayName(
  _prev: UpdateDisplayNameResult | null,
  formData: FormData
): Promise<UpdateDisplayNameResult> {
  try {
    const raw = String(formData.get("displayName") ?? "").trim();
    if (raw.length < 2) {
      return {
        ok: false,
        error: "Pon tu nombre, aunque sea de pila.",
      };
    }
    if (raw.length > MAX_NAME) {
      return {
        ok: false,
        error: "Máximo 50 caracteres.",
      };
    }
    if (/[<>]/.test(raw)) {
      return { ok: false, error: "Ese nombre no sirve. Prueba otro." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Entra otra vez para guardar tu nombre." };
    }

    const admin = createAdminClient();
    const { error: enrollmentError } = await admin
      .from("course_enrollments")
      .update({ display_name: raw })
      .eq("student_id", user.id);

    if (enrollmentError) {
      console.error("updateDisplayName enrollments:", enrollmentError.message);
      return {
        ok: false,
        error: "Algo salió mal. Intenta de nuevo.",
      };
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { display_name: raw } }
    );
    if (authError) {
      console.error("updateDisplayName metadata:", authError.message);
      return {
        ok: false,
        error: "Algo salió mal. Intenta de nuevo.",
      };
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true, message: "Listo. Así te voy a ver." };
  } catch (error) {
    console.error("updateDisplayName failed:", error);
    return { ok: false, error: "Algo salió mal. Intenta de nuevo." };
  }
}
