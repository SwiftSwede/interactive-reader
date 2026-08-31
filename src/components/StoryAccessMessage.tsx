export default function StoryAccessMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-paper-line px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="text-label-sm text-text-muted">Profe Kyle</p>
        </div>
      </header>
      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-headline-lg text-text-primary">{title}</h1>
        <p className="mt-3 text-body-main text-text-secondary">{body}</p>
      </section>
    </main>
  );
}
