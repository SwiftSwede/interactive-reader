import type { Metadata } from "next";
import Script from "next/script";
import { WorkshopWhen } from "@/components/workshop/WorkshopWhen";
import { googleCalendarUrl } from "@/lib/workshop/calendar";
import { workshopConfig } from "@/lib/workshop/config";

export const metadata: Metadata = {
  title: "Cupo reservado | Profe Kyle",
  robots: { index: false, follow: false },
};

export default function WorkshopThanksPage() {
  const whatsapp = workshopConfig.whatsappInvite;

  return (
    <main id="contenido">
      <Script id="meta-lead" strategy="afterInteractive">
        {`fbq('track','Lead');`}
      </Script>
      <section className="wk-thanks">
        <div className="wk-column">
          <h1>¡Listo! Tu cupo está reservado.</h1>
          <WorkshopWhen />
          {whatsapp ? (
            <a className="wk-cta" href={whatsapp}>
              Unirme al grupo de WhatsApp
            </a>
          ) : (
            <p>El enlace del grupo de WhatsApp te llega por email.</p>
          )}
          <div className="wk-actions">
            <a className="wk-secondary" href={googleCalendarUrl()}>
              Agregar a Google Calendar
            </a>
            <a className="wk-secondary" href="/workshop/calendar">
              Descargar el evento
            </a>
          </div>
          <p className="wk-note">
            Mientras esperas: si quieres empezar a entrenar tu boca además de tus oídos, mira{" "}
            <a href={workshopConfig.losSecretosUrl}>Los Secretos del Inglés Hablado</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
