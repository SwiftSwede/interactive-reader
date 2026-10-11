"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import {
  createProduct,
  createProductSchema,
  grantProduct,
  searchStudentsForGrant,
  setProductPublished,
} from "@/lib/product-admin";

export type ProductActionResult = { ok: false; error: string } | { ok: true; message: string };

function messageFrom(error: unknown): string {
  if (error instanceof z.ZodError) return "Revisa el producto.";
  if (error instanceof AppError && error.statusCode < 500) return error.message;
  console.error("product action:", error);
  return "Algo salió mal. Intenta de nuevo.";
}

export async function createProductAction(
  _prev: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  await requireTeacher("/teacher/products");
  const priceRaw = String(formData.get("priceCents") ?? "").trim();
  const priceCents = priceRaw === "" ? null : Number(priceRaw);
  const sourceProductIds = formData
    .getAll("sourceProductIds")
    .map((value) => String(value));

  try {
    const parsed = createProductSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      kind: formData.get("kind"),
      level: formData.get("level") || undefined,
      courseId: formData.get("courseId") || undefined,
      sourceProductIds,
      priceCents: priceCents === null || Number.isFinite(priceCents) ? priceCents : Number.NaN,
      isPublished: formData.get("isPublished") === "on",
    });
    await createProduct(parsed);
  } catch (error) {
    return { ok: false, error: messageFrom(error) };
  }

  revalidatePath("/teacher/products");
  return { ok: true, message: "Producto creado." };
}

export async function setProductPublishedAction(formData: FormData): Promise<void> {
  await requireTeacher("/teacher/products");
  const productId = String(formData.get("productId") ?? "");
  if (!z.string().uuid().safeParse(productId).success) return;
  try {
    await setProductPublished({
      productId,
      isPublished: formData.get("isPublished") === "on",
    });
  } catch (error) {
    console.error("setProductPublished:", error);
  }
  revalidatePath("/teacher/products");
}

export async function grantProductAction(
  _prev: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  await requireTeacher("/teacher/products");
  const productId = String(formData.get("productId") ?? "");
  const query = String(formData.get("query") ?? "");
  if (!z.string().uuid().safeParse(productId).success) {
    return { ok: false, error: "Elige un producto." };
  }

  try {
    const matches = await searchStudentsForGrant(query);
    if (matches.length === 0) {
      return { ok: false, error: "No encontré a ese estudiante." };
    }
    if (matches.length > 1) {
      const list = matches
        .map((student) => student.displayName ?? student.email)
        .join(", ");
      return {
        ok: false,
        error: `Hay varias personas. Escribe el email completo: ${list}.`,
      };
    }
    const result = await grantProduct({
      productId,
      studentId: matches[0].id,
    });
    revalidatePath("/teacher/products");
    return {
      ok: true,
      message: result === "already" ? "Ya lo tiene." : "Listo. Ya tiene acceso.",
    };
  } catch (error) {
    return { ok: false, error: messageFrom(error) };
  }
}
