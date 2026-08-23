export default function StoryAccessMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-gray-500">Profe Kyle</p>
        </div>
      </header>
      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm text-gray-600">{body}</p>
      </section>
    </main>
  );
}
