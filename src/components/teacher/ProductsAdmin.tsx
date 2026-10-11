"use client";

import { useActionState, useState } from "react";
import ActionButton from "@/components/ActionButton";
import {
  EditorField,
  EditorSection,
  fieldClass,
} from "@/components/teacher/content/editor-ui";
import {
  createProductAction,
  grantProductAction,
  setProductPublishedAction,
  type ProductActionResult,
} from "@/app/teacher/products/actions";
import type { ProductListItem } from "@/lib/product-admin";

const LEVELS = [
  { id: "beginner", label: "Principiante" },
  { id: "pre-intermediate", label: "Pre-intermedio" },
  { id: "intermediate", label: "Intermedio" },
  { id: "pronunciation", label: "Pronunciación" },
] as const;

function priceLabel(cents: number | null): string {
  if (cents == null) return "Sin precio";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductsAdmin({
  products,
  courses,
}: {
  products: ProductListItem[];
  courses: { id: string; name: string }[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createProductAction,
    null as ProductActionResult | null
  );
  const [grantState, grantAction, grantPending] = useActionState(
    grantProductAction,
    null as ProductActionResult | null
  );
  const [kind, setKind] = useState<"library" | "course" | "bundle">("library");

  return (
    <div className="flex flex-col gap-8">
      {products.length === 0 ? (
        <p className="text-body-main text-text-secondary">
          Todavía no hay productos.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="rounded-card border border-paper-line bg-surface px-4 py-3"
            >
              <p className="text-label-md text-text-primary">{product.name}</p>
              <p className="mt-1 text-label-sm text-text-secondary">
                {product.kind}. {product.itemSummary}. {priceLabel(product.priceCents)}.{" "}
                {product.isPublished ? "Publicado" : "Borrador"}
              </p>
              <form action={setProductPublishedAction} className="mt-3">
                <input type="hidden" name="productId" value={product.id} />
                <label className="flex min-h-11 items-center gap-3 text-label-md text-text-primary">
                  <input
                    type="checkbox"
                    name="isPublished"
                    defaultChecked={product.isPublished}
                    className="h-4 w-4"
                  />
                  Publicado
                </label>
                <button
                  type="submit"
                  className="mt-2 inline-flex min-h-11 items-center rounded-card border border-paper-line px-4 text-label-md text-text-primary hover:bg-surface-hover"
                >
                  Guardar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <EditorSection title="Nuevo producto">
        <form action={createAction} className="flex flex-col gap-4">
          <EditorField label="Nombre">
            <input name="name" required maxLength={120} className={fieldClass} />
          </EditorField>
          <EditorField label="Tipo">
            <select
              name="kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "library" | "course" | "bundle")
              }
              className={fieldClass}
            >
              <option value="library">Biblioteca</option>
              <option value="course">Curso</option>
              <option value="bundle">Paquete</option>
            </select>
          </EditorField>
          {kind === "library" ? (
            <EditorField label="Nivel">
              <select name="level" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Elige un nivel
                </option>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label}
                  </option>
                ))}
              </select>
            </EditorField>
          ) : null}
          {kind === "course" ? (
            <EditorField label="Curso autoguiado">
              <select name="courseId" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Elige un curso
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </EditorField>
          ) : null}
          {kind === "bundle" ? (
            <fieldset>
              <legend className="mb-1.5 block text-label-md text-text-secondary">
                Copiar de estos productos
              </legend>
              <p className="mb-2 text-label-sm text-text-muted">
                Se copia lo que otorgan ahora. Si luego los editas, este paquete no cambia.
              </p>
              <div className="flex flex-col gap-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex min-h-11 items-center gap-3 text-label-md text-text-primary"
                  >
                    <input
                      type="checkbox"
                      name="sourceProductIds"
                      value={product.id}
                      className="h-4 w-4"
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <EditorField label="Precio en centavos" hint="4700 son 47 dólares. Vacío si todavía no tiene precio.">
            <input
              name="priceCents"
              inputMode="numeric"
              className={fieldClass}
              placeholder="4700"
            />
          </EditorField>
          <label className="flex min-h-11 items-center gap-3 text-label-md text-text-primary">
            <input type="checkbox" name="isPublished" className="h-4 w-4" />
            Publicado
          </label>
          {createState?.ok === false ? (
            <p className="text-label-md text-text-secondary">{createState.error}</p>
          ) : null}
          {createState?.ok === true ? (
            <p className="text-label-md text-text-secondary">{createState.message}</p>
          ) : null}
          <ActionButton type="submit" pendingLabel="Creando..." disabled={createPending}>
            Crear producto
          </ActionButton>
        </form>
      </EditorSection>

      <EditorSection title="Dar acceso">
        <form action={grantAction} className="flex flex-col gap-4">
          <EditorField label="Producto">
            <select name="productId" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Elige un producto
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </EditorField>
          <EditorField label="Estudiante" hint="Nombre del grupo o email.">
            <input
              name="query"
              required
              minLength={2}
              className={fieldClass}
              placeholder="Nombre o email"
              autoComplete="off"
            />
          </EditorField>
          {grantState?.ok === false ? (
            <p className="text-label-md text-text-secondary">{grantState.error}</p>
          ) : null}
          {grantState?.ok === true ? (
            <p className="text-label-md text-text-secondary">{grantState.message}</p>
          ) : null}
          <ActionButton type="submit" pendingLabel="Guardando..." disabled={grantPending}>
            Dar acceso
          </ActionButton>
        </form>
      </EditorSection>
    </div>
  );
}
