import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  storyId: z.string().uuid(),
  roundsCompleted: z.literal(5),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Entra con tu email para guardar la practica." },
        { status: 401 }
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
    }

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id")
      .eq("id", parsed.data.storyId)
      .maybeSingle();

    if (storyError || !story) {
      return NextResponse.json(
        { error: "No encontre esa historia." },
        { status: 404 }
      );
    }

    const { error } = await supabase.from("choral_practice_completions").upsert(
      {
        user_id: user.id,
        story_id: parsed.data.storyId,
        rounds_completed: parsed.data.roundsCompleted,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,story_id" }
    );

    if (error) {
      console.error("choral-complete upsert failed:", error);
      return NextResponse.json(
        { error: "No pude guardar. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("choral-complete failed:", error);
    return NextResponse.json(
      { error: "Algo salio mal. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
