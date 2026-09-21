import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

/** Reserve before calling AI. The database serializes requests across instances. */
export async function consumeCheckAnswerRequest(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("consume_check_answer_request", {
    p_user_id: userId,
  });
  if (error || typeof data !== "boolean") {
    throw new AppError(
      "No se pudo procesar tu respuesta. Intenta de nuevo.",
      "RATE_LIMIT_UNAVAILABLE",
    );
  }
  return data;
}
