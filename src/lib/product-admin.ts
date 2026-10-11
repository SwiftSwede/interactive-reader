import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LibraryLevel, ProductKind } from "@/types";

export type ProductListItem = {
  id: string;
  name: string;
  kind: ProductKind;
  level: LibraryLevel | null;
  priceCents: number | null;
  isPublished: boolean;
  itemSummary: string;
};

export type StudentGrantHit = {
  id: string;
  email: string;
  displayName: string | null;
};

const LIBRARY_LEVELS = [
  "beginner",
  "pre-intermediate",
  "intermediate",
  "pronunciation",
] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  kind: z.enum(["library", "course", "bundle"]),
  level: z.enum(LIBRARY_LEVELS).optional(),
  courseId: z.string().uuid().optional(),
  sourceProductIds: z.array(z.string().uuid()).max(20).optional().default([]),
  priceCents: z.number().int().min(0).max(1_000_000).nullable(),
  isPublished: z.boolean(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

type ItemDraft = {
  item_type: "course" | "level_library";
  course_id: string | null;
  level: string | null;
};

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function itemKey(item: ItemDraft): string {
  return item.item_type === "course"
    ? `course:${item.course_id}`
    : `level:${item.level}`;
}

export async function listProducts(): Promise<ProductListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, name, kind, level, price_cents, is_published, product_items(item_type, level, course_id)")
    .order("created_at", { ascending: true });

  if (error) throw new AppError(error.message, "PRODUCT_LIST_FAILED", 500);

  return (data ?? []).map((row) => {
    const items = (Array.isArray(row.product_items)
      ? row.product_items
      : row.product_items
        ? [row.product_items]
        : []) as Array<{ item_type: string; level: string | null; course_id: string | null }>;
    const summary = items
      .map((item) =>
        item.item_type === "level_library"
          ? item.level ?? "nivel"
          : "curso"
      )
      .join(", ");
    return {
      id: row.id as string,
      name: row.name as string,
      kind: row.kind as ProductKind,
      level: (row.level as LibraryLevel | null) ?? null,
      priceCents: (row.price_cents as number | null) ?? null,
      isPublished: Boolean(row.is_published),
      itemSummary: summary || "Sin contenido",
    };
  });
}

export async function listSelfPacedCourseOptions(teacherId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .select("id, name, level")
    .eq("teacher_id", teacherId)
    .eq("format", "self_paced")
    .order("name", { ascending: true });
  if (error) throw new AppError(error.message, "COURSE_LIST_FAILED", 500);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    level: row.level as string,
  }));
}

async function itemsForProduct(input: CreateProductInput): Promise<ItemDraft[]> {
  if (input.kind === "library") {
    if (!input.level) {
      throw new AppError("Elige el nivel de la biblioteca", "PRODUCT_LEVEL", 422);
    }
    return [{ item_type: "level_library", course_id: null, level: input.level }];
  }

  if (input.kind === "course") {
    if (!input.courseId) {
      throw new AppError("Elige el curso", "PRODUCT_COURSE", 422);
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("courses")
      .select("id, format")
      .eq("id", input.courseId)
      .maybeSingle();
    if (error) throw new AppError(error.message, "COURSE_READ_FAILED", 500);
    if (!data || data.format !== "self_paced") {
      throw new AppError("Ese curso no es autoguiado", "PRODUCT_COURSE", 422);
    }
    return [{ item_type: "course", course_id: input.courseId, level: null }];
  }

  const sourceIds = input.sourceProductIds ?? [];
  if (sourceIds.length === 0) {
    throw new AppError("Elige al menos un producto", "PRODUCT_BUNDLE", 422);
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("product_items")
    .select("item_type, course_id, level")
    .in("product_id", sourceIds);
  if (error) throw new AppError(error.message, "PRODUCT_ITEMS_FAILED", 500);

  const seen = new Set<string>();
  const items: ItemDraft[] = [];
  for (const row of data ?? []) {
    const draft: ItemDraft = {
      item_type: row.item_type as ItemDraft["item_type"],
      course_id: (row.course_id as string | null) ?? null,
      level: (row.level as string | null) ?? null,
    };
    if (draft.item_type !== "course" && draft.item_type !== "level_library") continue;
    const key = itemKey(draft);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(draft);
  }
  if (items.length === 0) {
    throw new AppError("Esos productos no tienen nada que copiar", "PRODUCT_BUNDLE", 422);
  }
  return items;
}

export async function createProduct(input: CreateProductInput): Promise<string> {
  const parsed = createProductSchema.parse(input);
  const items = await itemsForProduct(parsed);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      name: plainText(parsed.name),
      description: plainText(parsed.description) || null,
      kind: parsed.kind,
      level: parsed.kind === "library" ? parsed.level : null,
      price_cents: parsed.priceCents,
      is_published: parsed.isPublished,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? "insert failed", "PRODUCT_CREATE_FAILED", 500);
  }

  const productId = data.id as string;
  const { error: itemError } = await admin.from("product_items").insert(
    items.map((item) => ({ ...item, product_id: productId }))
  );
  if (itemError) {
    await admin.from("products").delete().eq("id", productId);
    throw new AppError(itemError.message, "PRODUCT_ITEMS_FAILED", 500);
  }
  return productId;
}

export async function setProductPublished(input: {
  productId: string;
  isPublished: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ is_published: input.isPublished })
    .eq("id", input.productId);
  if (error) throw new AppError(error.message, "PRODUCT_PUBLISH_FAILED", 500);
}

export async function searchStudentsForGrant(
  query: string
): Promise<StudentGrantHit[]> {
  const needle = plainText(query).replace(/[%_]/g, "").slice(0, 80);
  if (needle.length < 2) return [];
  const admin = createAdminClient();

  const { data: byEmail, error: emailError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", `%${needle}%`)
    .neq("role", "teacher")
    .limit(8);
  if (emailError) throw new AppError(emailError.message, "STUDENT_SEARCH_FAILED", 500);

  const { data: byName, error: nameError } = await admin
    .from("course_enrollments")
    .select("student_id, display_name")
    .ilike("display_name", `%${needle}%`)
    .limit(20);
  if (nameError) throw new AppError(nameError.message, "STUDENT_SEARCH_FAILED", 500);

  const nameById = new Map<string, string>();
  for (const row of byName ?? []) {
    const name = (row.display_name as string).trim();
    if (!name) continue;
    if (!nameById.has(row.student_id as string)) {
      nameById.set(row.student_id as string, name);
    }
  }

  const hits = new Map<string, StudentGrantHit>();
  for (const row of byEmail ?? []) {
    hits.set(row.id as string, {
      id: row.id as string,
      email: row.email as string,
      displayName: nameById.get(row.id as string) ?? null,
    });
  }

  const missingIds = [...nameById.keys()].filter((id) => !hits.has(id));
  if (missingIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, email, role")
      .in("id", missingIds.slice(0, 8));
    if (profileError) {
      throw new AppError(profileError.message, "STUDENT_SEARCH_FAILED", 500);
    }
    for (const row of profiles ?? []) {
      if (row.role === "teacher") continue;
      hits.set(row.id as string, {
        id: row.id as string,
        email: row.email as string,
        displayName: nameById.get(row.id as string) ?? null,
      });
    }
  }

  return [...hits.values()].slice(0, 8);
}

export async function grantProduct(input: {
  productId: string;
  studentId: string;
}): Promise<"granted" | "already"> {
  const admin = createAdminClient();
  const { error } = await admin.from("purchases").insert({
    user_id: input.studentId,
    product_id: input.productId,
    stripe_checkout_session_id: null,
  });
  if (!error) return "granted";
  if (error.code === "23505") return "already";
  throw new AppError(error.message, "PURCHASE_GRANT_FAILED", 500);
}
