import Link from "next/link";

export default function ReviewCard() {
  return (
    <section className="mt-4 rounded-card border border-paper-line bg-surface px-4 py-3">
      <h2 className="text-headline-md text-text-primary">Repaso</h2>
      <p className="mt-1 text-body-main text-text-secondary">
        Hay ejercicios esperando.
      </p>
      <div className="mt-3">
        <Link
          href="/tools/practica?repaso=1"
          className="inline-flex min-h-12 items-center justify-center rounded-card bg-accent px-5 text-label-md font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-hover"
        >
          Practicar
        </Link>
      </div>
    </section>
  );
}
