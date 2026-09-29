import { enterStudentPreview } from "./actions";
import ActionButton from "@/components/ActionButton";

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
          <ActionButton
            type="submit"
            className="w-full h-12"
            pendingLabel="Entrando..."
          >
            Intermedio
          </ActionButton>
        </form>
        <form action={enterStudentPreview}>
          <input type="hidden" name="level" value="pre-intermediate" />
          <ActionButton
            type="submit"
            className="w-full h-12"
            pendingLabel="Entrando..."
          >
            Pre-intermedio
          </ActionButton>
        </form>
      </div>
    </section>
  );
}
