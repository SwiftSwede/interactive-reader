"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import WordTooltip, {
  type WordData,
  type ExpressionData,
} from "./WordTooltip";
import StoryAudioPlayer from "./StoryAudioPlayer";
import { recordWordLookup } from "@/app/lesson/[slug]/actions";
import {
  convertRequestsToFlag,
  requestWordFlag,
  setWordFlag,
} from "@/app/lesson/[slug]/word-flag-actions";
import { createClient } from "@/lib/supabase/client";
import {
  flagAnchorKey,
  nextOccurrenceIndex,
  requestCountByAnchor,
  shouldUnmarkAll,
  wordFlagClassName,
} from "@/lib/word-flags";
import type { WordFlag, WordFlagging, WordFlagRequest, WordFlagType } from "@/types";

// ── Types ──────────────────────────────────────────────────

export type WordTimestamp = {
  position: number;
  text: string;
  start: number;
  end: number;
};

type InteractiveStoryProps = {
  bodyText: string;
  words: WordData[];
  expressions: ExpressionData[];
  audioUrl: string;
  timestamps: WordTimestamp[];
  storyId?: string;
  sessionId?: string;
  trackLookups?: boolean;
  hideAudio?: boolean;
  kind?: "story" | "dialogue" | "movie_talk" | "song";
  flagging?: WordFlagging;
};

// ── Component ──────────────────────────────────────────────

export default function InteractiveStory({
  bodyText,
  words,
  expressions,
  audioUrl,
  timestamps,
  storyId,
  sessionId,
  trackLookups = false,
  hideAudio = false,
  kind = "story",
  flagging,
}: InteractiveStoryProps) {
  const [seenPositions, setSeenPositions] = useState<Set<number>>(new Set());
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [activeExpressionId, setActiveExpressionId] = useState<string | null>(
    null
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [flags, setFlags] = useState<WordFlag[]>(flagging?.flags ?? []);
  const [requests, setRequests] = useState<WordFlagRequest[]>(
    flagging?.requests ?? []
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // Refs for direct-DOM karaoke highlight (bypasses React render cycle).
  // Driving the highlight through React state (setAudioCurrentTime 60x/sec)
  // causes re-renders that mobile browsers can't keep up with, resulting
  // in the highlight flashing for 1 frame and disappearing.
  // Instead, StoryAudioPlayer calls onAudioTime with the current time,
  // and a RAF loop here directly toggles the .word-audio-current CSS class
  // on the appropriate DOM element via classList.
  const audioTimeRef = useRef(0);
  const karaokeRafRef = useRef<number | null>(null);
  const highlightedPosRef = useRef<number>(-1);

  // Build expression lookup
  const expressionMap = useMemo(() => {
    const map = new Map<string, ExpressionData>();
    for (const expr of expressions) {
      map.set(expr.id, expr);
    }
    return map;
  }, [expressions]);

  // Build expression group map: expression_id -> Set of word positions
  const expressionPositions = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const word of words) {
      if (word.expression_id) {
        let positions = map.get(word.expression_id);
        if (!positions) {
          positions = new Set();
          map.set(word.expression_id, positions);
        }
        positions.add(word.position);
      }
    }
    return map;
  }, [words]);

  useEffect(() => {
    setFlags(flagging?.flags ?? []);
  }, [flagging?.flags]);

  useEffect(() => {
    setRequests(flagging?.requests ?? []);
  }, [flagging?.requests]);

  const flagTypeMap = useMemo(() => {
    const map = new Map<string, WordFlagType[]>();
    for (const flag of flags) {
      const key = flagAnchorKey(flag.flagText, flag.occurrenceIndex);
      const list = map.get(key) ?? [];
      if (!list.includes(flag.flagType)) list.push(flag.flagType);
      map.set(key, list);
    }
    return map;
  }, [flags]);

  const requestCounts = useMemo(
    () => requestCountByAnchor(requests),
    [requests]
  );

  const showTeacherFlags = Boolean(flagging?.enabled);
  const showStudentRequest = Boolean(
    flagging &&
      !flagging.isTeacher &&
      flagging.sessionId &&
      flagging.readerMode === "classroom-live" &&
      kind !== "song"
  );

  const applyFlag = useCallback(
    (
      flagText: string,
      occurrenceIndex: number,
      flagType: WordFlagType,
      on: boolean
    ) => {
      setFlags((current) => {
        const exists = current.some(
          (row) =>
            row.flagText === flagText &&
            row.occurrenceIndex === occurrenceIndex &&
            row.flagType === flagType
        );
        if (on) {
          if (exists) return current;
          return [
            ...current,
            {
              id: `local-${flagType}-${flagText}-${occurrenceIndex}`,
              storyId: flagging?.storyId ?? "",
              flagType,
              flagText,
              occurrenceIndex,
            },
          ];
        }
        return current.filter(
          (row) =>
            !(
              row.flagText === flagText &&
              row.occurrenceIndex === occurrenceIndex &&
              row.flagType === flagType
            )
        );
      });
      if (on) {
        setRequests((current) =>
          current.filter(
            (row) =>
              !(
                row.flagText === flagText &&
                row.occurrenceIndex === occurrenceIndex
              )
          )
        );
      }
    },
    [flagging?.storyId]
  );

  const handleToggleFlag = useCallback(
    (
      flagText: string,
      occurrenceIndex: number,
      flagType: WordFlagType,
      on: boolean
    ) => {
      if (!flagging?.enabled) return;
      applyFlag(flagText, occurrenceIndex, flagType, on);
      void setWordFlag({
        storyId: flagging.storyId,
        flagText,
        occurrenceIndex,
        flagType,
        on,
        sessionId: flagging.sessionId,
      });
    },
    [applyFlag, flagging?.enabled, flagging?.sessionId, flagging?.storyId]
  );

  const handleRequestWord = useCallback(
    (flagText: string, occurrenceIndex: number) => {
      if (!flagging || flagging.isTeacher || !flagging.sessionId) return;
      const key = flagAnchorKey(flagText, occurrenceIndex);
      if ((requestCountByAnchor(requestsRef.current).get(key) ?? 0) > 0) {
        return;
      }
      setRequests((current) => [
        ...current,
        {
          id: `local-request-${flagText}-${occurrenceIndex}`,
          flagText,
          occurrenceIndex,
        },
      ]);
      void requestWordFlag({
        storyId: flagging.storyId,
        sessionId: flagging.sessionId,
        flagText,
        occurrenceIndex,
      });
    },
    [flagging]
  );

  const handleConvertRequests = useCallback(
    (flagText: string, occurrenceIndex: number) => {
      if (!flagging?.isTeacher || !flagging.sessionId) return;
      applyFlag(flagText, occurrenceIndex, "bold", true);
      void convertRequestsToFlag({
        storyId: flagging.storyId,
        sessionId: flagging.sessionId,
        flagText,
        occurrenceIndex,
      });
    },
    [applyFlag, flagging]
  );

  useEffect(() => {
    if (!flagging?.isTeacher || !flagging.sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`word-flag-requests-${flagging.sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "word_flag_requests",
          filter: `course_session_id=eq.${flagging.sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            flag_text?: string;
            occurrence_index?: number;
          };
          if (!row.id || row.flag_text == null || row.occurrence_index == null) {
            return;
          }
          const id = row.id;
          const flagText = row.flag_text;
          const occurrenceIndex = row.occurrence_index;
          setRequests((current) =>
            current.some((item) => item.id === id)
              ? current
              : [
                  ...current,
                  {
                    id,
                    flagText,
                    occurrenceIndex,
                  },
                ]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "word_flag_requests",
          filter: `course_session_id=eq.${flagging.sessionId}`,
        },
        (payload) => {
          const old = payload.old as {
            id?: string;
            flag_text?: string;
            occurrence_index?: number;
          } | null;
          if (old?.id) {
            setRequests((current) =>
              current.filter((item) => item.id !== old.id)
            );
            return;
          }
          if (old?.flag_text != null && old.occurrence_index != null) {
            setRequests((current) =>
              current.filter(
                (item) =>
                  !(
                    item.flagText === old.flag_text &&
                    item.occurrenceIndex === old.occurrence_index
                  )
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [flagging?.isTeacher, flagging?.sessionId]);

  useEffect(() => {
    if (!flagging?.enabled) return;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey || event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "b" && key !== "u") return;
      if (isTypingTarget(document.activeElement)) return;

      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }
      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const ancestorEl =
        ancestor.nodeType === Node.ELEMENT_NODE
          ? (ancestor as Element)
          : ancestor.parentElement;
      if (!ancestorEl || !container.contains(ancestorEl)) return;

      const spans = Array.from(
        container.querySelectorAll<HTMLElement>("[data-word-text]")
      ).filter((span) => {
        try {
          return range.intersectsNode(span);
        } catch {
          return false;
        }
      });
      if (spans.length === 0) return;

      event.preventDefault();
      const type: WordFlagType = key === "b" ? "bold" : "underline";
      const selected = spans.map((span) => {
        const flagText = span.dataset.wordText ?? "";
        const occurrenceIndex = Number(span.dataset.wordOccurrence);
        const types = flagsRef.current
          .filter(
            (row) =>
              row.flagText === flagText &&
              row.occurrenceIndex === occurrenceIndex
          )
          .map((row) => row.flagType);
        return { flagText, occurrenceIndex, types };
      });
      const unmark = shouldUnmarkAll(selected, type);
      for (const row of selected) {
        handleToggleFlag(row.flagText, row.occurrenceIndex, type, !unmark);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [flagging?.enabled, handleToggleFlag]);

  // ── Karaoke: direct DOM manipulation ───────────────────
  // Finds the word span elements once, then on each RAF tick
  // toggles the .word-audio-current class directly. No React
  // state updates, no re-renders, no virtual DOM diffing.

  const getWordSpans = useCallback(() => {
    return containerRef.current?.querySelectorAll<HTMLElement>(".word-span");
  }, []);

  // Binary search: last word whose start <= time
  const findPositionAtTime = useCallback(
    (time: number) => {
      if (time <= 0) return -1;
      let lo = 0;
      let hi = timestamps.length - 1;
      let result = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const ts = timestamps[mid];
        if (ts.start <= time) {
          result = ts.position;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    },
    [timestamps]
  );

  // The RAF loop that does the actual highlight via direct DOM access
  const karaokeTick = useCallback(() => {
    const spans = getWordSpans();
    if (!spans) return;

    // Interpolate the audio time for smoothness on mobile
    const time = audioTimeRef.current;
    const newPos = findPositionAtTime(time);

    if (newPos !== highlightedPosRef.current) {
      // Remove highlight from old word
      if (highlightedPosRef.current >= 0 && highlightedPosRef.current < spans.length) {
        spans[highlightedPosRef.current].classList.remove("word-audio-current");
      }
      // Add highlight to new word
      if (newPos >= 0 && newPos < spans.length) {
        spans[newPos].classList.add("word-audio-current");

        // Auto-scroll: only if word is near viewport edge
        const target = spans[newPos];
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        if (rect.top < 80 || rect.bottom > viewportHeight - 100) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      highlightedPosRef.current = newPos;
    }

    karaokeRafRef.current = requestAnimationFrame(karaokeTick);
  }, [getWordSpans, findPositionAtTime]);

  // Start/stop the karaoke RAF loop based on play state
  useEffect(() => {
    if (isAudioPlaying) {
      karaokeRafRef.current = requestAnimationFrame(karaokeTick);
    } else {
      if (karaokeRafRef.current) {
        cancelAnimationFrame(karaokeRafRef.current);
        karaokeRafRef.current = null;
      }
      // Clear highlight when audio stops
      const spans = getWordSpans();
      if (spans && highlightedPosRef.current >= 0 && highlightedPosRef.current < spans.length) {
        spans[highlightedPosRef.current].classList.remove("word-audio-current");
      }
      highlightedPosRef.current = -1;
    }
    return () => {
      if (karaokeRafRef.current) {
        cancelAnimationFrame(karaokeRafRef.current);
        karaokeRafRef.current = null;
      }
    };
  }, [isAudioPlaying, karaokeTick, getWordSpans]);

  // Split body text into paragraphs, then tokenize each paragraph.
  // Songs keep blank lines so stanzas match Completa la canción.
  const lyricLayout = kind === "song";
  const paragraphs = lyricLayout
    ? bodyText.split("\n")
    : bodyText.split("\n").filter((p) => p.trim());

  const handleActivate = useCallback((word: WordData) => {
    setActivePosition(word.position);
    setActiveExpressionId(word.expression_id);
    setSeenPositions((prev) => {
      const next = new Set(prev);
      next.add(word.position);
      if (word.expression_id) {
        const positions = expressionPositions.get(word.expression_id);
        if (positions) {
          for (const pos of positions) next.add(pos);
        }
      }
      return next;
    });
  }, [expressionPositions]);

  const handlePin = useCallback(
    (word: WordData) => {
      handleActivate(word);
    },
    [handleActivate]
  );

  const handleLookup = useCallback(
    (word: WordData) => {
      if (!trackLookups || !storyId) return;
      void recordWordLookup({
        wordId: word.id,
        storyId,
        sessionId,
      });
    },
    [trackLookups, storyId, sessionId]
  );

  const handleDismiss = useCallback(() => {
    setActivePosition(null);
    setActiveExpressionId(null);
  }, []);

  // Dismiss on a real outside click, not on the click that opened or pinned
  // the tooltip. Word spans handle their own clicks. The video modal is
  // excluded so Cerrar does not unpin.
  useEffect(() => {
    if (activePosition === null) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const path = e.composedPath();
      const clickedInsideProtected = path.some((node) => {
        if (!(node instanceof Element)) return false;
        return (
          node.closest(".word-span") != null ||
          node.closest(".word-tooltip") != null ||
          node.closest(".word-flag-badge") != null ||
          node.closest(".sound-video-modal") != null ||
          node.tagName === "DIALOG"
        );
      });
      if (clickedInsideProtected) return;

      handleDismiss();
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activePosition, handleDismiss]);

  // StoryAudioPlayer calls this ~60x/sec with the current audio time.
  // We store it in a ref (no state update) so React never re-renders.
  const handleAudioTimeUpdate = useCallback((time: number) => {
    audioTimeRef.current = time;
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsAudioPlaying(playing);
  }, []);

  let wordPosition = 0;
  const occurrenceCounts = new Map<string, number>();
  const audioDuration = timestamps.length > 0
    ? timestamps[timestamps.length - 1].end
    : 0;

  return (
    <div ref={containerRef}>
      {!hideAudio && (
        <StoryAudioPlayer
          audioUrl={audioUrl}
          duration={audioDuration}
          onTimeUpdate={handleAudioTimeUpdate}
          onPlayStateChange={handlePlayStateChange}
        />
      )}

      <div className={lyricLayout ? undefined : "space-y-4"}>
        {paragraphs.map((paragraph, paraIdx) => {
          if (lyricLayout && !paragraph.trim()) {
            return <div key={paraIdx} className="h-8" />;
          }
          const tokens = paragraph.split(/\s+/).filter((t) => t);
          const sceneBreak =
            kind === "movie_talk" && /^\*+\s*$/.test(paragraph.trim());
          if (sceneBreak) {
            return (
              <p
                key={paraIdx}
                className="border-t border-paper-line pt-4 text-center text-label-sm text-text-muted"
              >
                Escena {paragraphs.slice(0, paraIdx).filter((line) => /^\*+\s*$/.test(line.trim())).length + 1}
              </p>
            );
          }

          const dialogueName =
            kind === "dialogue"
              ? paragraph.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+):/)?.[1]
              : null;

          return (
            <p
              key={paraIdx}
              className={`text-story-body text-text-primary${lyricLayout ? " mb-0" : ""}`}
            >
              {tokens.map((token, tokenIdx) => {
                const currentPos = wordPosition++;
                const occurrenceIndex = nextOccurrenceIndex(
                  occurrenceCounts,
                  token
                );
                const word = words[currentPos];
                const flagKey = flagAnchorKey(token, occurrenceIndex);
                const types = flagTypeMap.get(flagKey) ?? [];
                const isBold = types.includes("bold");
                const isUnderline = types.includes("underline");
                const requestCount = flagging?.isTeacher
                  ? (requestCounts.get(flagKey) ?? 0)
                  : 0;
                const ownRequested =
                  !flagging?.isTeacher &&
                  (requestCounts.get(flagKey) ?? 0) > 0;
                const trailing = tokenIdx < tokens.length - 1 ? " " : "";

                if (!word) {
                  return (
                    <span key={tokenIdx}>
                      <span
                        data-word-text={token}
                        data-word-occurrence={String(occurrenceIndex)}
                        className={wordFlagClassName({
                          bold: isBold,
                          underline: isUnderline,
                          requestedOwn: ownRequested,
                        })}
                      >
                        {token}
                      </span>
                      {trailing}
                    </span>
                  );
                }

                // Normalize curly quotes for matching
                const tokenNorm = token
                  .replace(/\u2018/g, "'")
                  .replace(/\u2019/g, "'")
                  .replace(/\u201C/g, '"')
                  .replace(/\u201D/g, '"');
                const wordNorm = word.text
                  .replace(/\u2018/g, "'")
                  .replace(/\u2019/g, "'")
                  .replace(/\u201C/g, '"')
                  .replace(/\u201D/g, '"');

                if (tokenNorm !== wordNorm) {
                  return (
                    <span key={tokenIdx}>
                      <span
                        data-word-text={token}
                        data-word-occurrence={String(occurrenceIndex)}
                        className={wordFlagClassName({
                          bold: isBold,
                          underline: isUnderline,
                          requestedOwn: ownRequested,
                        })}
                      >
                        {token}
                      </span>
                      {trailing}
                    </span>
                  );
                }

                // Find expression for this word (if any)
                const expression = word.expression_id
                  ? expressionMap.get(word.expression_id) || null
                  : null;

                const isHighlighted = seenPositions.has(word.position);
                const isActive = activePosition === word.position;
                const isExpressionActive =
                  !!word.expression_id &&
                  word.expression_id === activeExpressionId &&
                  activePosition !== word.position;

                return (
                  <span
                    key={tokenIdx}
                    className={
                      dialogueName && tokenIdx === 0
                        ? "font-heading text-label-md text-text-accent"
                        : undefined
                    }
                  >
                    <WordTooltip
                      word={word}
                      expression={expression}
                      isHighlighted={isHighlighted}
                      onPin={handlePin}
                      isActive={isActive}
                      isExpressionActive={isExpressionActive}
                      hintClass={
                        !hideAudio && !hasInteracted && currentPos < 4
                          ? "word-hint"
                          : undefined
                      }
                      onFirstInteraction={() => setHasInteracted(true)}
                      onLookup={handleLookup}
                      flagText={token}
                      occurrenceIndex={occurrenceIndex}
                      isBold={isBold}
                      isUnderline={isUnderline}
                      requestCount={requestCount}
                      ownRequested={ownRequested}
                      showTeacherFlags={showTeacherFlags}
                      showStudentRequest={showStudentRequest}
                      onToggleFlag={handleToggleFlag}
                      onRequestWord={handleRequestWord}
                      onConvertRequests={handleConvertRequests}
                    />
                    {trailing}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
