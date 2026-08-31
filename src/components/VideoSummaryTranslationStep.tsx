"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  saveVideoSummaryTranslation,
  markParagraphReady,
} from "@/app/story/[slug]/video-summary-actions";
import {
  HighlightedText,
  TeachingNotePopup,
} from "@/components/VideoSummaryTeachingNote";
import type {
  VideoSummaryParagraph,
  VideoSummaryTeachingNote,
} from "@/types";

export default function VideoSummaryTranslationStep({
  storyId,
  sessionId,
  isTeacher,
  reviewMode,
  paragraphs: initialParagraphs,
  englishCheatSheet,
  notes: initialNotes,
}: {
  storyId: string;
  sessionId: string;
  isTeacher: boolean;
  reviewMode: boolean;
  paragraphs: VideoSummaryParagraph[];
  englishCheatSheet: string[];
  notes: VideoSummaryTeachingNote[];
}) {
  const [paragraphs, setParagraphs] = useState(initialParagraphs);
  const [notes, setNotes] = useState(initialNotes);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const row of initialParagraphs) {
      next[row.id] = row.englishTranslation ?? "";
    }
    return next;
  });
  const [popup, setPopup] = useState<{
    position: number;
    selectedText: string;
  } | null>(null);
  const started = useRef<Set<string>>(new Set());
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isTeacher && !reviewMode) return;
    const supabase = createClient();
    const apply = (row: {
      id?: string;
      english_translation?: string | null;
      translation_started_at?: string | null;
      translation_completed_at?: string | null;
      position?: number;
    }) => {
      if (!row.id) return;
      setParagraphs((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                englishTranslation: row.english_translation ?? item.englishTranslation,
                translationStartedAt:
                  row.translation_started_at ?? item.translationStartedAt,
                translationCompletedAt:
                  row.translation_completed_at ?? item.translationCompletedAt,
              }
            : item
        )
      );
    };
    const channel = supabase
      .channel(`video-summary-${storyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_summary_paragraphs",
          filter: `story_id=eq.${storyId}`,
        },
        (payload) => apply(payload.new as never)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_summary_teaching_notes",
          filter: `course_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            story_id: string;
            course_session_id: string;
            paragraph_position: number;
            selected_text: string;
            note: string;
            note_type: VideoSummaryTeachingNote["noteType"];
            created_by: string;
            created_at: string;
          };
          setNotes((current) =>
            current.some((item) => item.id === row.id)
              ? current
              : [
                  ...current,
                  {
                    id: row.id,
                    storyId: row.story_id,
                    courseSessionId: row.course_session_id,
                    paragraphPosition: row.paragraph_position,
                    selectedText: row.selected_text,
                    note: row.note,
                    noteType: row.note_type,
                    createdBy: row.created_by,
                    createdAt: row.created_at,
                  },
                ]
          );
        }
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("video_summary_paragraphs")
        .select(
          "id, english_translation, translation_started_at, translation_completed_at"
        )
        .eq("story_id", storyId);
      for (const row of data ?? []) apply(row);
    }, 3000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [isTeacher, reviewMode, storyId, sessionId]);

  function scheduleSave(paragraphId: string, english: string) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const first = !started.current.has(paragraphId);
      if (first) started.current.add(paragraphId);
      void saveVideoSummaryTranslation({
        paragraphId,
        english,
        firstKeystroke: first,
      });
    }, 800);
  }

  function captureSelection(position: number) {
    if (!isTeacher || reviewMode) return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected || selected.length > 200) return;
    setPopup({ position, selectedText: selected });
  }

  return (
    <div className="space-y-8">
      {isTeacher && (
        <div>
          <button
            type="button"
            onClick={() => setCheatOpen((value) => !value)}
            className="min-h-11 text-label-md text-text-accent"
          >
            {cheatOpen ? "Ocultar inglés original" : "Ver inglés original"}
          </button>
          {cheatOpen && (
            <div className="mt-2 rounded-card border border-paper-line bg-accent-softer px-3 py-3">
              <p className="text-label-sm text-text-muted">Solo tú ves esto.</p>
              {englishCheatSheet.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-2 font-heading text-body-main text-text-primary"
                >
                  {index + 1}. {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {paragraphs.map((paragraph) => {
        const paragraphNotes = notes.filter(
          (note) => note.paragraphPosition === paragraph.position
        );
        const english = paragraph.englishTranslation;
        const showTeacherInput = isTeacher && !reviewMode;
        return (
          <article
            key={paragraph.id}
            className="rounded-card border border-paper-line bg-white px-4 py-4"
          >
            <p className="text-label-sm text-text-muted">
              Párrafo {paragraph.position + 1}
            </p>
            <HighlightedText
              text={paragraph.spanishText}
              notes={paragraphNotes}
              className="mt-2 font-heading text-story-body text-text-primary"
              onSelect={() => captureSelection(paragraph.position)}
            />
            {showTeacherInput ? (
              <>
                <label
                  className="mt-4 block text-label-sm text-text-secondary"
                  htmlFor={`tr-${paragraph.id}`}
                >
                  Inglés
                </label>
                <textarea
                  id={`tr-${paragraph.id}`}
                  value={drafts[paragraph.id] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((current) => ({
                      ...current,
                      [paragraph.id]: value,
                    }));
                    scheduleSave(paragraph.id, value);
                  }}
                  onMouseUp={() => captureSelection(paragraph.position)}
                  rows={5}
                  className="mt-1 w-full rounded-card border-2 border-accent bg-white px-3 py-2 font-heading text-body-main text-text-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void markParagraphReady(paragraph.id)}
                  className="mt-3 h-11 rounded-card bg-success px-4 text-label-md font-medium text-white"
                >
                  Listo
                </button>
              </>
            ) : english ? (
              <HighlightedText
                text={english}
                notes={paragraphNotes}
                className="mt-3 font-heading text-story-body text-text-primary"
                onSelect={() => captureSelection(paragraph.position)}
              />
            ) : (
              <p className="teacher-typing-pulse mt-3 text-label-md text-text-muted">
                El profe está traduciendo...
              </p>
            )}

            {popup?.position === paragraph.position && (
              <TeachingNotePopup
                sessionId={sessionId}
                storyId={storyId}
                paragraphPosition={paragraph.position}
                selectedText={popup.selectedText}
                onClose={() => setPopup(null)}
                onSaved={(note) =>
                  setNotes((current) => [...current, note])
                }
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
