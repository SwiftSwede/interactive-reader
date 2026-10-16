import { WorkshopForm } from "./WorkshopForm";
import { WorkshopWhen } from "./WorkshopWhen";

const sounds = [
  {
    ipa: "ʔ",
    body: (
      <>
        El sonido secreto de &quot;button&quot;, &quot;mountain&quot; y &quot;Manhattan&quot;.
        Cuando lo escuchas, no lo puedes creer.
      </>
    ),
  },
  {
    ipa: "ə",
    body: (
      <>
        El sonido más común del inglés gringo, y el más invisible. Está en casi todas las
        oraciones y tu oído lo borra.
      </>
    ),
  },
  {
    ipa: "ɪ",
    body: (
      <>
        La razón por la que &quot;ship&quot; y &quot;sheep&quot; te suenan igual. Después de este
        taller, nunca más.
      </>
    ),
  },
];

const steps = [
  {
    title: "Demo en vivo.",
    body: "Escuchas el sonido natural en vivo.",
  },
  {
    title: "Entrenamiento.",
    body: "Posición de boca, ejemplos, y práctica guiada, sonido por sonido.",
  },
  {
    title: "El cierre.",
    body: "Escuchas inglés real y notas la diferencia. Es el mismo entrenamiento de una clase real de mi metodología, condensado.",
  },
];

const faqs = [
  {
    q: "¿Es gratis de verdad?",
    a: "Sí. Es una clase de muestra de mi metodología. Si te gusta lo que enseño, te contaré cómo seguir conmigo. Sin presión.",
  },
  {
    q: "¿Y si no puedo asistir?",
    a: "Regístrate igual: te mando la grabación.",
  },
  {
    q: "¿Necesito micro o cámara?",
    a: "No. Solo tú, tus oídos, y algo para tomar notas.",
  },
  {
    q: "¿Qué pasa después?",
    a: "Te mando la grabación, ejercicios para practicar en casa, y (solo si quieres) las opciones para seguir entrenando conmigo.",
  },
];

function RepeatCta({
  heading,
  note,
  tone = "navy",
}: {
  heading: string;
  note: string;
  tone?: "navy" | "paper";
}) {
  return (
    <section className={tone === "paper" ? "wk-repeat wk-repeat-paper" : "wk-repeat"}>
      <div className="wk-column">
        <h2>{heading}</h2>
        <p>{note}</p>
        <a className="wk-cta" href="#cupo">
          Reservar mi cupo
        </a>
      </div>
    </section>
  );
}

export function WorkshopLanding({ aviso }: { aviso?: string }) {
  return (
    <>
      <a className="wk-skip wk-cta" href="#contenido">
        Saltar al contenido
      </a>
    <main id="contenido">
      <p className="wk-announce">
        <strong>Gratis.</strong> Taller en vivo, miércoles 28 de octubre, 45 minutos.
      </p>
      <header className="wk-hero">
        <div className="wk-hero-photo" aria-hidden>
          <picture>
            <source type="image/webp" srcSet="/workshop/liberty.webp 1600w" sizes="100vw" />
            <img
              src="/workshop/liberty.jpg"
              alt=""
              width={1600}
              height={1060}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div className="wk-column">
          <div className="wk-hero-copy">
            <p className="wk-kicker">Taller gratis en vivo</p>
            <h1>
              Tu inglés no está mal.
              <br />
              <strong>Son tus oídos.</strong>
            </h1>
            <p className="wk-sub">
              Los 3 sonidos que más les cuesta escuchar a los latinos. Sales escuchando el inglés
              diferente.
            </p>
            <p className="wk-facts">En vivo por Zoom, 45 minutos, sin tarjeta</p>
          </div>
          <WorkshopWhen />
          <WorkshopForm aviso={aviso} />
        </div>
      </header>

      <section className="wk-learn">
        <div className="wk-column">
          <h2>Lo que vas a aprender en este taller gratis:</h2>
          <p>
            El inglés tiene sonidos que el español no usa, y tu oído los salta automáticamente.
            Vas a conocer los tres que más problemas te causan al escuchar:
          </p>
          <ol className="wk-sounds">
            {sounds.map((sound, index) => (
              <li key={sound.ipa}>
                <span className="wk-mark" aria-hidden>
                  {sound.ipa}
                </span>
                <p>
                  <span className="wk-sr">Sonido {index + 1}. </span>
                  {sound.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <RepeatCta
        heading="Reserva tu cupo gratis"
        note="45 minutos en vivo. Si no puedes asistir, te mandamos la grabación."
      />

      <section className="wk-story">
        <div className="wk-column">
          <h2>La promesa</h2>
          <p>
            Conocí a Andrea, una colombiana que trabajaba como niñera en Estados Unidos. Tenía
            buen inglés: vocabulario, gramática, todo. Pero cuando la familia americana hablaba
            rápido, se perdía.
          </p>
          <p>
            Seis clases de pronunciación después, entendía todo. No porque hubiera estudiado más
            vocabulario. Porque por fin escuchaba los sonidos que su oído se estaba saltando.
          </p>
          <p>Eso es este taller: 45 minutos para abrir tus oídos.</p>
        </div>
      </section>

      <section className="wk-plain wk-gray">
        <div className="wk-column">
          <h2>Cómo van a ser los 45 minutos</h2>
          <ol className="wk-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="wk-plain">
        <div className="wk-column">
          <h2>Para quién es</h2>
          <div className="wk-who">
            <article>
              <h3>Para ti si</h3>
              <p>
                Eres nivel pre-intermedio o intermedio. Te cuesta seguir a los gringos en
                películas, llamadas o reuniones. Quieres entrenar tu escucha con alguien que
                lleva 8 años enseñando pronunciación a latinos.
              </p>
            </article>
            <article>
              <h3>No es para ti si</h3>
              <p>
                Eres principiante total (tengo otros materiales para ti, te escribiré después
                del taller). O tu inglés es avanzado y escuchas sin problema (te ahorraré el
                tiempo).
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="wk-bio wk-gray">
        <div className="wk-column">
          <h2>Tu profesor</h2>
          <div className="wk-bio-layout">
            <picture>
              <source type="image/webp" srcSet="/workshop/kyle.webp" />
              <img
                className="wk-portrait"
                src="/workshop/kyle.png"
                alt="Profe Kyle"
                width={360}
                height={319}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <div className="wk-bio-copy">
              <p>
                Profe Kyle es profesor certificado por Cambridge (CELTA), con un Bachelor of Arts de
                la University of British Columbia en Vancouver, más de 450,000 seguidores y más de 7
                cursos de autoaprendizaje para hispanohablantes. Desde 2018 enseña inglés en línea
                exclusivamente a estudiantes latinos.
              </p>
              <p>
                Su método: enseñar inglés a través del contexto, no de la gramática, priorizando la
                pronunciación, el vocabulario cotidiano y la fluidez práctica desde el primer día.
              </p>
            </div>
          </div>
        </div>
      </section>

      <RepeatCta
        heading="El formulario está arriba"
        note="Nombre, email, y elige cómo describes tu inglés. Toma menos de un minuto."
        tone="paper"
      />

      <section className="wk-plain">
        <div className="wk-column">
          <h2>Preguntas</h2>
          <div className="wk-faq">
            {faqs.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
