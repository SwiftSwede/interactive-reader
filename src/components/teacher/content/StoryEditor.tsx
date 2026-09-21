"use client";

import { useState } from "react";
import {
  BODY_TEXT_WARNING,
  VIDEO_PARAGRAPH_DELETE_WARNING,
  contentKindLabel,
  isStoryKind,
  mintLyricBlank,
  reuseLyricBlankIds,
  storyWordCount,
  type StoryForEdit,
} from "@/lib/content-editor";
import {
  indexedLyricLines,
  parseLineTimestamps,
  parseLyricsIpa,
  parseLyricBlanks,
  serializeLyricsIpa,
} from "@/lib/music";
import { splitTranscriptScenes } from "@/lib/movietalk";
import type {
  DrillFocusType,
  LyricBlank,
  PronunciationWordNote,
  QuestionLevel,
} from "@/types";
import {
  AddButton,
  EditorField,
  EditorSection,
  ReorderControls,
  SaveBar,
  WarningBanner,
  fieldClass,
  monoFieldClass,
  moveItem,
} from "@/components/teacher/content/editor-ui";
import {
  saveComprehensionAction,
  saveDrillAction,
  saveMovieTalkAction,
  saveParagraphsAction,
  savePersonalAction,
  saveStoryFieldsAction,
} from "@/app/teacher/content/actions";

function newId(): string {
  return crypto.randomUUID();
}

function parseNotes(raw: unknown): PronunciationWordNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is PronunciationWordNote =>
      !!item &&
      typeof item === "object" &&
      typeof (item as PronunciationWordNote).word === "string" &&
      typeof (item as PronunciationWordNote).note === "string"
  );
}

export default function StoryEditor({ data }: { data: StoryForEdit }) {
  const kind = isStoryKind(data.story.kind) ? data.story.kind : "story";
  return (
    <div className="flex flex-col gap-8">
      <p className="text-label-sm text-text-muted">
        {contentKindLabel(kind)} · {data.story.slug}
      </p>
      <BasicsSection data={data} kind={kind} />
      {kind === "movie_talk" ? <MovieTalkSection data={data} /> : null}
      {kind === "video_summary" ? <ParagraphsSection data={data} /> : null}
      {kind === "song" ? <SongSection data={data} /> : null}
      {kind !== "song" && kind !== "video_summary" ? (
        <>
          <QuestionsSection data={data} />
          {data.personalQuestions.length > 0 || kind === "story" || kind === "dialogue" ? (
            <PersonalSection data={data} />
          ) : null}
        </>
      ) : null}
      {data.pronunciationDrill ? <DrillSection data={data} /> : null}
    </div>
  );
}

function BasicsSection({
  data,
  kind,
}: {
  data: StoryForEdit;
  kind: string;
}) {
  const initialCount = data.story.word_count;
  const [title, setTitle] = useState(data.story.title);
  const [bodyText, setBodyText] = useState(
    kind === "movie_talk" ? data.story.body_text : data.story.body_text
  );
  const [youtubeUrl, setYoutubeUrl] = useState(data.story.youtube_url ?? "");
  const [spanishSummary, setSpanishSummary] = useState(
    data.story.spanish_summary ?? ""
  );
  const [synopsis, setSynopsis] = useState(data.story.synopsis ?? "");
  const [warmup, setWarmup] = useState(data.story.warmup_question ?? "");
  const [freeWrite, setFreeWrite] = useState(data.story.free_write_minutes ?? 5);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState({
    title: data.story.title,
    bodyText: data.story.body_text,
    youtubeUrl: data.story.youtube_url ?? "",
    spanishSummary: data.story.spanish_summary ?? "",
    synopsis: data.story.synopsis ?? "",
    warmup: data.story.warmup_question ?? "",
    freeWrite: data.story.free_write_minutes ?? 5,
  });

  const dirty =
    title !== baseline.title ||
    (kind !== "movie_talk" && bodyText !== baseline.bodyText) ||
    youtubeUrl !== baseline.youtubeUrl ||
    spanishSummary !== baseline.spanishSummary ||
    synopsis !== baseline.synopsis ||
    warmup !== baseline.warmup ||
    freeWrite !== baseline.freeWrite;

  const wordCountChanged =
    kind !== "movie_talk" &&
    storyWordCount(bodyText) !== initialCount &&
    bodyText !== baseline.bodyText;

  return (
    <EditorSection title="Datos">
      <EditorField label="Título">
        <input
          className={fieldClass}
          value={title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      {kind === "movie_talk" ? (
        <>
          <EditorField label="Sinopsis">
            <textarea
              className={fieldClass}
              rows={4}
              value={synopsis}
              onChange={(event) => {
                setSynopsis(event.target.value);
                setSaved(false);
              }}
            />
          </EditorField>
          <EditorField
            label="Warm-up (opcional)"
            hint="Si lo dejas vacío, esa pantalla no aparece en la clase."
          >
            <textarea
              className={fieldClass}
              rows={3}
              value={warmup}
              onChange={(event) => {
                setWarmup(event.target.value);
                setSaved(false);
              }}
            />
          </EditorField>
        </>
      ) : (
        <EditorField label={kind === "song" ? "Letra" : kind === "video_summary" ? "Texto en inglés" : "Texto"}>
          <textarea
            className={monoFieldClass}
            rows={16}
            value={bodyText}
            onChange={(event) => {
              setBodyText(event.target.value);
              setSaved(false);
            }}
          />
        </EditorField>
      )}
      {kind === "song" || kind === "video_summary" ? (
        <EditorField label="YouTube">
          <input
            className={fieldClass}
            value={youtubeUrl}
            onChange={(event) => {
              setYoutubeUrl(event.target.value);
              setSaved(false);
            }}
          />
        </EditorField>
      ) : null}
      {kind === "video_summary" ? (
        <>
          <EditorField label="Resumen en español">
            <textarea
              className={fieldClass}
              rows={8}
              value={spanishSummary}
              onChange={(event) => {
                setSpanishSummary(event.target.value);
                setSaved(false);
              }}
            />
          </EditorField>
          <EditorField label="Minutos de escritura libre">
            <input
              type="number"
              min={1}
              max={30}
              className={fieldClass}
              value={freeWrite}
              onChange={(event) => {
                setFreeWrite(Number(event.target.value));
                setSaved(false);
              }}
            />
          </EditorField>
        </>
      ) : null}
      {wordCountChanged ? <WarningBanner>{BODY_TEXT_WARNING}</WarningBanner> : null}
      {kind === "song" &&
      data.story.line_timestamps &&
      bodyText !== baseline.bodyText ? (
        <WarningBanner>
          Si cambias la letra, los timestamps de karaoke pueden quedar
          desfasados.
        </WarningBanner>
      ) : null}
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveStoryFieldsAction(data.story.slug, {
            title,
            bodyText: kind === "movie_talk" ? undefined : bodyText,
            youtubeUrl: kind === "song" || kind === "video_summary" ? youtubeUrl : undefined,
            spanishSummary: kind === "video_summary" ? spanishSummary : undefined,
            synopsis: kind === "movie_talk" ? synopsis : undefined,
            warmupQuestion: kind === "movie_talk" ? warmup : undefined,
            freeWriteMinutes: kind === "video_summary" ? freeWrite : undefined,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline({
            title,
            bodyText: kind === "movie_talk" ? data.story.body_text : bodyText,
            youtubeUrl,
            spanishSummary,
            synopsis,
            warmup,
            freeWrite,
          });
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function QuestionsSection({ data }: { data: StoryForEdit }) {
  const [questions, setQuestions] = useState(
    data.comprehensionQuestions.map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer ?? "",
      level: (row.level === "inferential" ? "inferential" : "factual") as QuestionLevel,
    }))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState(JSON.stringify(questions));
  const dirty = JSON.stringify(questions) !== baseline;

  return (
    <EditorSection title="Comprensión">
      {data.comprehensionResponseCount > 0 ? (
        <WarningBanner>
          Esta lección ya tiene {data.comprehensionResponseCount} respuestas de
          estudiantes. Borrar una pregunta borra esas respuestas.
        </WarningBanner>
      ) : null}
      {questions.map((row, index) => (
        <div
          key={row.id}
          className="rounded-card border border-paper-line p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-label-md text-text-secondary">
              Pregunta {index + 1}
            </p>
            <ReorderControls
              index={index}
              total={questions.length}
              onMove={(direction) => {
                setQuestions(moveItem(questions, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                const extra =
                  data.comprehensionResponseCount > 0
                    ? " También se borran las respuestas de estudiantes."
                    : "";
                if (!window.confirm(`¿Quito esta pregunta?${extra}`)) return;
                setQuestions(questions.filter((item) => item.id !== row.id));
                setSaved(false);
              }}
              deleteLabel="Quitar pregunta"
            />
          </div>
          <textarea
            className={fieldClass}
            rows={3}
            value={row.question}
            onChange={(event) => {
              const next = [...questions];
              next[index] = { ...row, question: event.target.value };
              setQuestions(next);
              setSaved(false);
            }}
          />
          <input
            className={`${fieldClass} mt-3`}
            placeholder="Respuesta (opcional)"
            value={row.answer}
            onChange={(event) => {
              const next = [...questions];
              next[index] = { ...row, answer: event.target.value };
              setQuestions(next);
              setSaved(false);
            }}
          />
          <select
            className={`${fieldClass} mt-3`}
            value={row.level}
            onChange={(event) => {
              const next = [...questions];
              next[index] = {
                ...row,
                level: event.target.value as QuestionLevel,
              };
              setQuestions(next);
              setSaved(false);
            }}
          >
            <option value="factual">Factual</option>
            <option value="inferential">Inferencial</option>
          </select>
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setQuestions([
            ...questions,
            { id: newId(), question: "", answer: "", level: "factual" },
          ]);
          setSaved(false);
        }}
      />
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveComprehensionAction(
            data.story.slug,
            data.story.id,
            questions.map((row) => ({
              id: row.id,
              question: row.question,
              answer: row.answer,
              level: row.level,
            }))
          );
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(JSON.stringify(questions));
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function PersonalSection({ data }: { data: StoryForEdit }) {
  const [questions, setQuestions] = useState(
    data.personalQuestions.map((row) => ({
      id: row.id,
      question: row.question,
    }))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState(JSON.stringify(questions));
  const dirty = JSON.stringify(questions) !== baseline;

  return (
    <EditorSection title="Preguntas personales">
      {questions.map((row, index) => (
        <div
          key={row.id}
          className="rounded-card border border-paper-line p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-label-md text-text-secondary">
              Pregunta {index + 1}
            </p>
            <ReorderControls
              index={index}
              total={questions.length}
              onMove={(direction) => {
                setQuestions(moveItem(questions, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                setQuestions(questions.filter((item) => item.id !== row.id));
                setSaved(false);
              }}
              deleteLabel="Quitar pregunta"
            />
          </div>
          <textarea
            className={fieldClass}
            rows={3}
            value={row.question}
            onChange={(event) => {
              const next = [...questions];
              next[index] = { ...row, question: event.target.value };
              setQuestions(next);
              setSaved(false);
            }}
          />
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setQuestions([...questions, { id: newId(), question: "" }]);
          setSaved(false);
        }}
      />
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await savePersonalAction(
            data.story.slug,
            data.story.id,
            questions
          );
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(JSON.stringify(questions));
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function DrillSection({ data }: { data: StoryForEdit }) {
  const drill = data.pronunciationDrill;
  if (!drill) return null;
  const [standard, setStandard] = useState(drill.practica_coral_standard);
  const [phonetic, setPhonetic] = useState(drill.practica_coral_phonetic);
  const [ipa, setIpa] = useState(drill.practica_coral_ipa);
  const [legend, setLegend] = useState(drill.symbol_legend ?? "");
  const [focusType, setFocusType] = useState<DrillFocusType>(
    drill.focus_type === "ed-s-rules" || drill.focus_type === "emphasized-syllable"
      ? drill.focus_type
      : "sounds"
  );
  const [focusContent, setFocusContent] = useState(drill.focus_content);
  const [explanation, setExplanation] = useState(drill.coral_explanation ?? "");
  const [notes, setNotes] = useState(parseNotes(drill.word_notes));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({
    standard,
    phonetic,
    ipa,
    legend,
    focusType,
    focusContent,
    explanation,
    notes,
  });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  return (
    <EditorSection title="Pronunciación">
      <EditorField label="Práctica coral (inglés)">
        <input
          className={fieldClass}
          value={standard}
          onChange={(event) => {
            setStandard(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Práctica coral (fonético)">
        <input
          className={fieldClass}
          value={phonetic}
          onChange={(event) => {
            setPhonetic(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Práctica coral (IPA)">
        <input
          className={monoFieldClass}
          value={ipa}
          onChange={(event) => {
            setIpa(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Leyenda">
        <textarea
          className={fieldClass}
          rows={4}
          value={legend}
          onChange={(event) => {
            setLegend(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Enfoque">
        <select
          className={fieldClass}
          value={focusType}
          onChange={(event) => {
            setFocusType(event.target.value as DrillFocusType);
            setSaved(false);
          }}
        >
          <option value="sounds">Sonidos</option>
          <option value="ed-s-rules">Reglas -ed / -s</option>
          <option value="emphasized-syllable">Sílabas fuertes</option>
        </select>
      </EditorField>
      <EditorField label="Contenido del enfoque">
        <textarea
          className={fieldClass}
          rows={4}
          value={focusContent}
          onChange={(event) => {
            setFocusContent(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Notas de la coral">
        <textarea
          className={fieldClass}
          rows={4}
          value={explanation}
          onChange={(event) => {
            setExplanation(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      {notes.map((note, index) => (
        <div key={`${note.word}-${index}`} className="rounded-card border border-paper-line p-4">
          <div className="mb-3 flex justify-end">
            <ReorderControls
              index={index}
              total={notes.length}
              onMove={(direction) => {
                setNotes(moveItem(notes, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                setNotes(notes.filter((_, i) => i !== index));
                setSaved(false);
              }}
              deleteLabel="Quitar nota"
            />
          </div>
          <input
            className={fieldClass}
            placeholder="Palabra"
            value={note.word}
            onChange={(event) => {
              const next = [...notes];
              next[index] = { ...note, word: event.target.value };
              setNotes(next);
              setSaved(false);
            }}
          />
          <textarea
            className={`${fieldClass} mt-3`}
            rows={2}
            placeholder="Nota"
            value={note.note}
            onChange={(event) => {
              const next = [...notes];
              next[index] = { ...note, note: event.target.value };
              setNotes(next);
              setSaved(false);
            }}
          />
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setNotes([...notes, { word: "", note: "" }]);
          setSaved(false);
        }}
      />
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveDrillAction(data.story.slug, drill.id, {
            practicaCoralStandard: standard,
            practicaCoralPhonetic: phonetic,
            practicaCoralIpa: ipa,
            symbolLegend: legend,
            focusType,
            focusContent,
            wordNotes: notes,
            coralExplanation: explanation,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function SongSection({ data }: { data: StoryForEdit }) {
  const [bio, setBio] = useState(data.story.artist_bio ?? "");
  const [meaning, setMeaning] = useState(data.story.song_meaning ?? "");
  const [blanks, setBlanks] = useState<LyricBlank[]>(
    parseLyricBlanks(data.story.lyric_blanks)
  );
  const [ipaLines, setIpaLines] = useState(() => {
    const parsed = parseLyricsIpa(data.story.lyrics_ipa);
    const byIndex = new Map(parsed.map((row) => [row.lineIndex, row.ipaText]));
    return indexedLyricLines(data.story.body_text).map((line, index) => ({
      lineIndex: index,
      preview: line,
      ipaText: byIndex.get(index) ?? "",
    }));
  });
  const [timestampsJson, setTimestampsJson] = useState(() =>
    data.story.line_timestamps
      ? JSON.stringify(data.story.line_timestamps, null, 2)
      : ""
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({ bio, meaning, blanks, ipaLines, timestampsJson });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  return (
    <EditorSection title="Canción">
      <EditorField label="Bio del artista">
        <textarea
          className={fieldClass}
          rows={8}
          value={bio}
          onChange={(event) => {
            setBio(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField
        label="Significado"
        hint="Escrito por ti, no por IA"
      >
        <textarea
          className={fieldClass}
          rows={8}
          value={meaning}
          onChange={(event) => {
            setMeaning(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      {data.songAttemptCount > 0 ? (
        <WarningBanner>
          Ya hay intentos de huecos. Agregar está bien. Borrar o cambiar ids
          descuadra las puntuaciones.
        </WarningBanner>
      ) : null}
      {blanks.map((blank, index) => (
        <div key={`${blank.id}-${index}`} className="rounded-card border border-paper-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-label-md text-text-secondary">Hueco {blank.id}</p>
            <ReorderControls
              index={index}
              total={blanks.length}
              onMove={(direction) => {
                setBlanks(moveItem(blanks, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                setBlanks(blanks.filter((_, i) => i !== index));
                setSaved(false);
              }}
              deleteLabel="Quitar hueco"
            />
          </div>
          <input
            className={fieldClass}
            placeholder="Pista"
            value={blank.prompt}
            onChange={(event) => {
              const next = [...blanks];
              next[index] = { ...blank, prompt: event.target.value };
              setBlanks(next);
              setSaved(false);
            }}
          />
          <input
            className={`${fieldClass} mt-3`}
            placeholder="Respuesta"
            value={blank.answer}
            onChange={(event) => {
              const next = [...blanks];
              next[index] = { ...blank, answer: event.target.value };
              setBlanks(reuseLyricBlankIds(next));
              setSaved(false);
            }}
          />
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setBlanks([...blanks, mintLyricBlank(blanks)]);
          setSaved(false);
        }}
      />
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-text-secondary">IPA por línea</p>
        {ipaLines.map((line, index) => (
          <label key={line.lineIndex} className="block">
            <span className="mb-1 block text-label-sm text-text-muted">
              {line.preview}
            </span>
            <input
              className={monoFieldClass}
              value={line.ipaText}
              onChange={(event) => {
                const next = [...ipaLines];
                next[index] = { ...line, ipaText: event.target.value };
                setIpaLines(next);
                setSaved(false);
              }}
            />
          </label>
        ))}
      </div>
      <EditorField
        label="Timestamps (JSON)"
        hint="Pega la salida de tap-align-lyrics.html"
      >
        <textarea
          className={monoFieldClass}
          rows={8}
          value={timestampsJson}
          onChange={(event) => {
            setTimestampsJson(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          let timestamps: unknown = null;
          if (timestampsJson.trim()) {
            try {
              timestamps = JSON.parse(timestampsJson);
              if (parseLineTimestamps(timestamps).length === 0) {
                setError("Ese JSON de timestamps no se entiende.");
                return;
              }
            } catch {
              setError("Ese JSON de timestamps no se entiende.");
              return;
            }
          }
          setPending(true);
          setError("");
          const result = await saveStoryFieldsAction(data.story.slug, {
            artistBio: bio,
            songMeaning: meaning,
            lyricBlanks: blanks,
            lyricsIpa: serializeLyricsIpa(
              ipaLines.map((line) => ({
                lineIndex: line.lineIndex,
                ipaText: line.ipaText,
              }))
            ),
            lineTimestamps: timestamps,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function MovieTalkSection({ data }: { data: StoryForEdit }) {
  const chunks = splitTranscriptScenes(data.story.body_text);
  const [scenes, setScenes] = useState(
    data.movieTalkScenes.map((scene, index) => ({
      id: scene.id,
      youtubeUrl: scene.youtube_url ?? "",
      startSeconds: scene.start_seconds?.toString() ?? "",
      endSeconds: scene.end_seconds?.toString() ?? "",
      questionStart: scene.question_start_position?.toString() ?? "",
      questionEnd: scene.question_end_position?.toString() ?? "",
      transcript: chunks[index] ?? `[Escena ${index + 1}]`,
    }))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify(scenes);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  function toNumber(value: string): number | null {
    if (!value.trim()) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <EditorSection title="Escenas">
      {data.comprehensionResponseCount > 0 ? (
        <WarningBanner>
          Ya hay respuestas de estudiantes. Cambiar o borrar escenas puede
          descuadrar las preguntas de cada clip.
        </WarningBanner>
      ) : null}
      <p className="text-sm text-text-muted">
        El diálogo de cada escena. El número de bloques tiene que coincidir con
        las escenas.
      </p>
      {scenes.map((scene, index) => (
        <div key={scene.id} className="rounded-card border border-paper-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-label-md text-text-secondary">
              Escena {index + 1}
            </p>
            <ReorderControls
              index={index}
              total={scenes.length}
              onMove={(direction) => {
                setScenes(moveItem(scenes, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                const extra =
                  data.comprehensionResponseCount > 0
                    ? " Ya hay respuestas de estudiantes."
                    : "";
                if (!window.confirm(`¿Quito esta escena?${extra}`)) return;
                setScenes(scenes.filter((item) => item.id !== scene.id));
                setSaved(false);
              }}
              deleteLabel="Quitar escena"
            />
          </div>
          <textarea
            className={`${monoFieldClass} mb-3`}
            rows={8}
            value={scene.transcript}
            onChange={(event) => {
              const next = [...scenes];
              next[index] = { ...scene, transcript: event.target.value };
              setScenes(next);
              setSaved(false);
            }}
          />
          <input
            className={fieldClass}
            placeholder="YouTube"
            value={scene.youtubeUrl}
            onChange={(event) => {
              const next = [...scenes];
              next[index] = { ...scene, youtubeUrl: event.target.value };
              setScenes(next);
              setSaved(false);
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              className={fieldClass}
              placeholder="Inicio (s)"
              value={scene.startSeconds}
              onChange={(event) => {
                const next = [...scenes];
                next[index] = { ...scene, startSeconds: event.target.value };
                setScenes(next);
                setSaved(false);
              }}
            />
            <input
              className={fieldClass}
              placeholder="Fin (s)"
              value={scene.endSeconds}
              onChange={(event) => {
                const next = [...scenes];
                next[index] = { ...scene, endSeconds: event.target.value };
                setScenes(next);
                setSaved(false);
              }}
            />
            <input
              className={fieldClass}
              placeholder="Pregunta desde"
              value={scene.questionStart}
              onChange={(event) => {
                const next = [...scenes];
                next[index] = { ...scene, questionStart: event.target.value };
                setScenes(next);
                setSaved(false);
              }}
            />
            <input
              className={fieldClass}
              placeholder="Pregunta hasta"
              value={scene.questionEnd}
              onChange={(event) => {
                const next = [...scenes];
                next[index] = { ...scene, questionEnd: event.target.value };
                setScenes(next);
                setSaved(false);
              }}
            />
          </div>
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setScenes([
            ...scenes,
            {
              id: newId(),
              youtubeUrl: "",
              startSeconds: "",
              endSeconds: "",
              questionStart: "",
              questionEnd: "",
              transcript: `[Escena ${scenes.length + 1}]`,
            },
          ]);
          setSaved(false);
        }}
      />
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveMovieTalkAction(
            data.story.slug,
            data.story.id,
            scenes.map((scene) => ({
              id: scene.id,
              youtubeUrl: scene.youtubeUrl,
              startSeconds: toNumber(scene.startSeconds),
              endSeconds: toNumber(scene.endSeconds),
              questionStartPosition: toNumber(scene.questionStart),
              questionEndPosition: toNumber(scene.questionEnd),
              transcript: scene.transcript,
            }))
          );
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}

function ParagraphsSection({ data }: { data: StoryForEdit }) {
  const [paragraphs, setParagraphs] = useState(
    data.paragraphs.map((row) => ({
      id: row.id,
      spanishText: row.spanish_text,
      englishTranslation: row.english_translation ?? "",
    }))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify(paragraphs);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  return (
    <EditorSection title="Párrafos">
      {paragraphs.map((row, index) => (
        <div key={row.id} className="rounded-card border border-paper-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-label-md text-text-secondary">
              Párrafo {index + 1}
            </p>
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-card px-3 text-sm text-error hover:bg-error-bg"
              onClick={() => {
                if (!window.confirm(VIDEO_PARAGRAPH_DELETE_WARNING)) return;
                setParagraphs(paragraphs.filter((item) => item.id !== row.id));
                setSaved(false);
              }}
            >
              Eliminar
            </button>
          </div>
          <textarea
            className={fieldClass}
            rows={4}
            placeholder="Español"
            value={row.spanishText}
            onChange={(event) => {
              const next = [...paragraphs];
              next[index] = { ...row, spanishText: event.target.value };
              setParagraphs(next);
              setSaved(false);
            }}
          />
          <textarea
            className={`${fieldClass} mt-3`}
            rows={4}
            placeholder="Inglés (clase en vivo)"
            value={row.englishTranslation}
            onChange={(event) => {
              const next = [...paragraphs];
              next[index] = { ...row, englishTranslation: event.target.value };
              setParagraphs(next);
              setSaved(false);
            }}
          />
        </div>
      ))}
      <AddButton
        label="+ Agregar"
        onClick={() => {
          setParagraphs([
            ...paragraphs,
            { id: newId(), spanishText: "", englishTranslation: "" },
          ]);
          setSaved(false);
        }}
      />
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveParagraphsAction(
            data.story.slug,
            data.story.id,
            paragraphs.map((row) => ({
              id: row.id,
              spanishText: row.spanishText,
              englishTranslation: row.englishTranslation || null,
            }))
          );
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}
