// Seed the four library products for Slice 87.
//
// Column ownership (ADR 012):
//   Inserts only. If a product with the same name already exists, this
//   script does not update is_published, price_cents, stripe_price_id,
//   description, kind, or level.
//   Owns on insert: products.name, kind, level, price_cents (4700),
//     is_published (false), description (null), and one product_items row.
//   Never touches: purchases, courses, course_lessons, stripe_price_id.
//
//   npx tsx scripts/seed-products.ts
//
// Does not create courses. Kyle adds those in Contenido.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const LIBRARIES = [
  {
    name: "Biblioteca: principiante",
    level: "beginner",
  },
  {
    name: "Biblioteca: pre-intermedio",
    level: "pre-intermediate",
  },
  {
    name: "Biblioteca: intermedio",
    level: "intermediate",
  },
  {
    name: "Biblioteca: pronunciación",
    level: "pronunciation",
  },
] as const;

async function countTable(table: "products" | "product_items" | "purchases" | "course_lessons") {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error(`${table} probe failed:`, error.message);
    process.exit(1);
  }
  console.log(`${table}: ${count ?? 0}`);
}

async function main() {
  const admin = createAdminClient();

  const probe = await admin.from("products").select("id").limit(1);
  if (probe.error) {
    console.error(
      "products is missing. Apply supabase/migrations/20261010_slice87_multi_course_commerce.sql first."
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  for (const library of LIBRARIES) {
    const { data: existing, error: readError } = await admin
      .from("products")
      .select("id")
      .eq("name", library.name)
      .maybeSingle();

    if (readError) {
      console.error(`${library.name} read failed:`, readError.message);
      process.exit(1);
    }

    if (existing) {
      console.log(`${library.name}: already present`);
      continue;
    }

    const { data: created, error: insertError } = await admin
      .from("products")
      .insert({
        name: library.name,
        description: null,
        kind: "library",
        level: library.level,
        price_cents: 4700,
        stripe_price_id: null,
        is_published: false,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error(`${library.name} insert failed:`, insertError?.message);
      process.exit(1);
    }

    const { error: itemError } = await admin.from("product_items").insert({
      product_id: created.id,
      item_type: "level_library",
      course_id: null,
      level: library.level,
    });

    if (itemError) {
      console.error(`${library.name} item insert failed:`, itemError.message);
      process.exit(1);
    }

    console.log(`${library.name}: inserted`);
  }

  await countTable("products");
  await countTable("product_items");
  await countTable("purchases");
  await countTable("course_lessons");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
