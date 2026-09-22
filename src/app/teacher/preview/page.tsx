import { enterStudentPreview } from "./actions";

export const metadata = {
  title: "Ver como estudiante - Profe Kyle",
};

export default function TeacherPreviewPage() {
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Ver como estudiante</h1>
      <p className="mt-3 max-w-xl text-body-main text-text-secondary">
        Ves exactamente lo que ven tus estudiantes: las mismas puertas, los
        mismos candados. Solo lectura: nada se guarda, nadie queda marcado
        presente.
      </p>
      <div className="mt-8 flex max-w-xl flex-col gap-3">
        <form action={enterStudentPreview}>
          <input type="hidden" name="level" value="intermediate" />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-card bg-accent px-5 text-label-md font-semibold text-white hover:bg-accent-hover active:bg-accent-hover"
          >
            Intermedio
          </button>
        </form>
        <form action={enterStudentPreview}>
          <input type="hidden" name="level" value="pre-intermediate" />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-card bg-accent px-5 text-label-md font-semibold text-white hover:bg-accent-hover active:bg-accent-hover"
          >
            Pre-intermedio
          </button>
        </form>
      </div>
    </section>
  );
}
