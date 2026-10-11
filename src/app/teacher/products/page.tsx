import { requireTeacher } from "@/lib/auth-server";
import { listProducts, listSelfPacedCourseOptions } from "@/lib/product-admin";
import ProductsAdmin from "@/components/teacher/ProductsAdmin";

export const metadata = {
  title: "Productos - Profe Kyle",
};

export default async function TeacherProductsPage() {
  const teacher = await requireTeacher("/teacher/products");
  const [products, courses] = await Promise.all([
    listProducts(),
    listSelfPacedCourseOptions(teacher.id),
  ]);

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Productos</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Bibliotecas, cursos y paquetes. Publicar todavía no abre una tienda.
        Desde aquí le das acceso a un estudiante antes de Stripe.
      </p>
      <div className="mt-8">
        <ProductsAdmin products={products} courses={courses} />
      </div>
    </section>
  );
}
