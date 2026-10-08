"use client";

import { useState, useCallback, useEffect, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import WordTooltip, {
  type WordData,
  type ExpressionData,
} from "./WordTooltip";
import StoryAudioPlayer from "./StoryAudioPlayer";
import { recordWordLookup } from "@/app/lesson/[slug]/actions";
import {
  audioHighlightMode,
  lookedUpPositions,
  sentenceIdsForBody,
  sentenceRefLabel,
} from "@/lib/sentence-highlight";
import {
  convertRequestsToFlag,
  requestWordFlag,
  saveWordFlagNote,
  setWordFlag,
} from "@/app/lesson/[slug]/word-flag-actions";
import NoteLightbox from "@/components/NoteLightbox";
import {
  isMovieTalkSceneBreak,
  isMovieTalkStageDirection,
  MOVIE_TALK_SPEAKER_RE,
  speakerOfLine,
} from "@/lib/movietalk";
import { createClient } from "@/lib/supabase/client";
import {
  flagAnchorKey,
  nextOccurrenceIndex,
  requestCountByAnchor,
  shouldUnmarkAll,
  wordFlagClassName,
} from "@/lib/word-flags";
import type { WordFlag, WordFlagging, WordFlagRequest, WordFlagType } from "@/types";

export type WordFlagStateControl = {
  flags: WordFlag[];
  requests: WordFlagRequest[];
  setFlags: Dispatch<SetStateAction<WordFlag[]>>;
  setRequests: Dispatch<SetStateAction<WordFlagRequest[]>>;
};

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
  lookedUpWordIds?: string[];
  hideAudio?: boolean;
  kind?: "story" | "dialogue" | "movie_talk" | "song";
  /** Story running text only. Song bios pass false; they default to kind=story. */
  showSentenceNumbers?: boolean;
  flagging?: WordFlagging;
  /** Lifted flag state so marks survive step changes in StorySteps. */
  wordFlagState?: WordFlagStateControl;
  visibleSceneIndex?: number;
  highlightSpeaker?: string | null;
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
  lookedUpWordIds = [],
  hideAudio = false,
  kind = "story",
  showSentenceNumbers,
  flagging,
  wordFlagState,
  visibleSceneIndex,
  highlightSpeaker = null,
}: InteractiveStoryProps) {
  const [seenPositions, setSeenPositions] = useState<Set<number>>(() =>
    lookedUpPositions(words, lookedUpWordIds)
  );
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [activeExpressionId, setActiveExpressionId] = useState<string | null>(
    null
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [internalFlags, setInternalFlags] = useState<WordFlag[]>(
    flagging?.flags ?? []
  );
  const [internalRequests, setInternalRequests] = useState<WordFlagRequest[]>(
    flagging?.requests ?? []
  );
  const flags = wordFlagState?.flags ?? internalFlags;
  const setFlags = wordFlagState?.setFlags ?? setInternalFlags;
  const requests = wordFlagState?.requests ?? internalRequests;
  const setRequests = wordFlagState?.setRequests ?? setInternalRequests;
  const [openNote, setOpenNote] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // Refs for direct-DOM sentence highlight (bypasses React render cycle).
  // Driving the highlight through React state (setAudioCurrentTime 60x/sec)
  // causes re-renders that mobile browsers can't keep up with.
  // Instead, StoryAudioPlayer calls onAudioTime with the current time,
  // and a RAF loop here directly toggles the .sentence-audio-current CSS class.
  const audioTimeRef = useRef(0);
  const karaokeRafRef = useRef<number | null>(null);
  const highlightedSentenceRef = useRef<number>(-1);
  const highlightMode = audioHighlightMode(kind);
  const sentenceIds = useMemo(
    () => sentenceIdsForBody(bodyText, kind),
    [bodyText, kind]
  );
  const showSentenceRefs = kind === "story" && showSentenceNumbers !== false;
  const sentenceIdsRef = useRef(sentenceIds);
  sentenceIdsRef.current = sentenceIds;

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
    if (wordFlagState) return;
    setInternalFlags(flagging?.flags ?? []);
  }, [flagging?.flags, wordFlagState]);

  useEffect(() => {
    if (wordFlagState) return;
    setInternalRequests(flagging?.requests ?? []);
  }, [flagging?.requests, wordFlagState]);

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

  const noteByAnchor = useMemo(() => {
    const map = new Map<string, string>();
    for (const flag of flags) {
      const note = flag.note?.trim();
      if (!note) continue;
      const key = flagAnchorKey(flag.flagText, flag.occurrenceIndex);
      if (!map.has(key)) map.set(key, note);
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
              note: null,
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
      if (flagging.saveResponses === false) return;
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

  const handleSaveNote = useCallback(
    (flagText: string, occurrenceIndex: number, note: string) => {
      if (!flagging?.enabled) return;
      const key = flagAnchorKey(flagText, occurrenceIndex);
      const types = flagTypeMap.get(key) ?? [];
      if (types.length === 0) return;
      setFlags((current) =>
        current.map((row) =>
          row.flagText === flagText && row.occurrenceIndex === occurrenceIndex
            ? { ...row, note }
            : row
        )
      );
      for (const flagType of types) {
        void saveWordFlagNote({
          storyId: flagging.storyId,
          flagText,
          occurrenceIndex,
          flagType,
          note,
        });
      }
    },
    [flagging?.enabled, flagging?.storyId, flagTypeMap]
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
    if (
      !flagging ||
      flagging.isTeacher ||
      flagging.readerMode !== "classroom-live" ||
      (kind !== "story" && kind !== "dialogue" && kind !== "movie_talk")
    ) {
      return;
    }
    const supabase = createClient();
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("word_flags")
        .select("id, story_id, flag_type, flag_text, occurrence_index, note")
        .eq("story_id", flagging.storyId);
      if (!data) return;
      setFlags(
        data.flatMap((row) => {
          if (row.flag_type !== "bold" && row.flag_type !== "underline") {
            return [];
          }
          return [
            {
              id: row.id,
              storyId: row.story_id,
              flagType: row.flag_type,
              flagText: row.flag_text,
              occurrenceIndex: row.occurrence_index,
              note: row.note ?? null,
            },
          ];
        })
      );
    }, 3000);
    return () => window.clearInterval(poll);
  }, [flagging, kind]);

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

  // ── Sentence highlight: direct DOM manipulation ────────
  const karaokeTick = useCallback(() => {
    if (highlightMode === "none") return;

    const time = audioTimeRef.current;
    const newPos = findPositionAtTime(time);
    const ids = sentenceIdsRef.current;
    const newSentence = newPos >= 0 ? (ids[newPos] ?? -1) : -1;

    if (newSentence !== highlightedSentenceRef.current) {
      const root = containerRef.current;
      if (root) {
        if (highlightedSentenceRef.current >= 0) {
          root
            .querySelectorAll(
              `.sentence-unit[data-sentence-id="${highlightedSentenceRef.current}"]`
            )
            .forEach((el) => el.classList.remove("sentence-audio-current"));
        }
        if (newSentence >= 0) {
          const target = root.querySelector<HTMLElement>(
            `.sentence-unit[data-sentence-id="${newSentence}"]`
          );
          if (target) {
            target.classList.add("sentence-audio-current");
          }
        }
      }
      highlightedSentenceRef.current = newSentence;
    }

    karaokeRafRef.current = requestAnimationFrame(karaokeTick);
  }, [highlightMode, findPositionAtTime]);

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
      const root = containerRef.current;
      if (root && highlightedSentenceRef.current >= 0) {
        root
          .querySelectorAll(
            `.sentence-unit[data-sentence-id="${highlightedSentenceRef.current}"]`
          )
          .forEach((el) => el.classList.remove("sentence-audio-current"));
      }
      highlightedSentenceRef.current = -1;
    }
    return () => {
      if (karaokeRafRef.current) {
        cancelAnimationFrame(karaokeRafRef.current);
        karaokeRafRef.current = null;
      }
    };
  }, [isAudioPlaying, karaokeTick]);

  // Split body text into paragraphs, then tokenize each paragraph.
  // Songs keep blank lines so stanzas match Completa la canción.
  const lyricLayout = kind === "song";
  const scriptLayout = kind === "dialogue" || kind === "movie_talk";
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
          node.closest(".word-help-sheet") != null ||
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
  let currentScene = 0;
  const occurrenceCounts = new Map<string, number>();
  const audioDuration = timestamps.length > 0
    ? timestamps[timestamps.length - 1].end
    : 0;

  return (
    <div ref={containerRef} className="story-running-text">
      {!hideAudio && (
        <StoryAudioPlayer
          audioUrl={audioUrl}
          duration={audioDuration}
          onTimeUpdate={handleAudioTimeUpdate}
          onPlayStateChange={handlePlayStateChange}
        />
      )}

      <div
        className={
          lyricLayout ? undefined : scriptLayout ? "script-stack" : "space-y-4"
        }
      >
        {paragraphs.map((paragraph, paraIdx) => {
          if (lyricLayout && !paragraph.trim()) {
            return <div key={paraIdx} className="h-8" />;
          }
          const tokens = paragraph.split(/\s+/).filter((t) => t);
          const sceneBreak =
            kind === "movie_talk" && isMovieTalkSceneBreak(paragraph);
          if (sceneBreak) {
            const divider =
              visibleSceneIndex == null ? (
                <p
                  key={paraIdx}
                  className="border-t border-paper-line pt-4 text-center text-label-sm text-text-muted"
                >
                  Escena{" "}
                  {paragraphs
                    .slice(0, paraIdx)
                    .filter((line) => isMovieTalkSceneBreak(line)).length + 1}
                </p>
              ) : null;
            currentScene += 1;
            return divider;
          }

          const movieTalkName =
            kind === "movie_talk" ? speakerOfLine(paragraph) : null;
          const dialogueName =
            kind === "dialogue"
              ? paragraph.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+):/)?.[1]
              : null;
          const speakerName = movieTalkName ?? dialogueName;
          const speakerJoin = movieTalkName ? "-" : dialogueName ? ":" : "";
          const inView =
            visibleSceneIndex == null || currentScene === visibleSceneIndex;

          if (
            (kind === "dialogue" || kind === "movie_talk") &&
            isMovieTalkStageDirection(paragraph)
          ) {
            if (!inView) return null;
            return (
              <p key={paraIdx} className="text-label-sm italic text-text-muted">
                {paragraph.trim()}
              </p>
            );
          }

          const spokenTokens = speakerName
            ? paragraph
                .replace(
                  movieTalkName
                    ? new RegExp(MOVIE_TALK_SPEAKER_RE.source + "\\s*")
                    : /^([A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+):\s*/,
                  ""
                )
                .split(/\s+/)
                .filter((t) => t)
            : tokens;

          if (!inView) {
            for (const token of spokenTokens) {
              wordPosition++;
              nextOccurrenceIndex(occurrenceCounts, token);
            }
            return null;
          }

          const highlighted =
            Boolean(highlightSpeaker) && speakerName === highlightSpeaker;

          return (
            <p
              key={paraIdx}
              data-speaker={speakerName ?? undefined}
              className={`text-story-body text-text-primary${lyricLayout ? " mb-0" : ""}${
                speakerName ? " script-line" : ""
              }${kind === "movie_talk" ? " movie-talk-line" : ""}${
                highlighted ? " movie-talk-line-on" : ""
              }`}
            >
              {speakerName && (
                <span
                  className={`script-speaker font-heading text-label-md${
                    kind === "movie_talk"
                      ? ` movie-talk-speaker${highlighted ? " movie-talk-speaker-on" : ""}`
                      : " text-text-accent"
                  }`}
                >
                  {speakerName}
                  {speakerJoin}
                </span>
              )}
              {(() => {
                const groups: {
                  sentenceId: number;
                  start: number;
                  tokens: { token: string; tokenIdx: number }[];
                }[] = [];
                spokenTokens.forEach((token, tokenIdx) => {
                  const sid = sentenceIds[wordPosition + tokenIdx] ?? 0;
                  const last = groups[groups.length - 1];
                  if (!last || last.sentenceId !== sid) {
                    groups.push({
                      sentenceId: sid,
                      start: wordPosition + tokenIdx,
                      tokens: [{ token, tokenIdx }],
                    });
                  } else {
                    last.tokens.push({ token, tokenIdx });
                  }
                });
                const spoken = groups.map((group) => {
                  const refLabel = showSentenceRefs
                    ? sentenceRefLabel(group.sentenceId)
                    : null;
                  return (
                  <span
                    key={`s-${group.sentenceId}-${group.start}`}
                    className="sentence-unit"
                    data-sentence-id={group.sentenceId}
                  >
                    {refLabel != null ? (
                      <span
                        className="pointer-events-none mr-1 select-none text-label-sm text-text-muted tabular-nums"
                        aria-hidden="true"
                      >
                        {refLabel}
                      </span>
                    ) : null}
                    {group.tokens.map(({ token, tokenIdx }) => {
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
                const flagNote = noteByAnchor.get(flagKey) ?? null;
                const requestCount = flagging?.isTeacher
                  ? (requestCounts.get(flagKey) ?? 0)
                  : 0;
                const ownRequested =
                  !flagging?.isTeacher &&
                  (requestCounts.get(flagKey) ?? 0) > 0;
                const trailing = tokenIdx < spokenTokens.length - 1;
                const gap = trailing ? <span className="word-gap"> </span> : null;
                const flagClass = `${wordFlagClassName({
                  bold: isBold,
                  underline: isUnderline,
                  requestedOwn: ownRequested,
                })}${flagNote ? " word-flag-has-note" : ""}`.trim();

                const unannotated = !word || (() => {
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
                  return tokenNorm !== wordNorm;
                })();

                if (unannotated) {
                  return (
                    <span key={tokenIdx}>
                      <span
                        data-word-text={token}
                        data-word-occurrence={String(occurrenceIndex)}
                        className={flagClass}
                        onClick={
                          flagNote && !showTeacherFlags
                            ? (e) => {
                                e.stopPropagation();
                                setOpenNote(flagNote);
                              }
                            : undefined
                        }
                      >
                        {token}
                      </span>
                      {gap}
                    </span>
                  );
                }

                const expression = word.expression_id
                  ? expressionMap.get(word.expression_id) || null
                  : null;

                const isHighlighted = seenPositions.has(word.position);
                const isActive = activePosition === word.position;
                const expressionGroupOn =
                  !!word.expression_id &&
                  word.expression_id === activeExpressionId;
                const bridgeSpace =
                  expressionGroupOn &&
                  words[currentPos + 1]?.expression_id === word.expression_id;
                const runStart =
                  expressionGroupOn &&
                  words[currentPos - 1]?.expression_id !== word.expression_id;
                const runClass = expressionGroupOn
                  ? `word-expr-run${runStart ? " word-expr-run-start" : ""}${
                      bridgeSpace ? "" : " word-expr-run-end"
                    }`
                  : undefined;

                return (
                  <span key={tokenIdx}>
                    <span className={runClass}>
                    <WordTooltip
                      word={word}
                      expression={expression}
                      isHighlighted={isHighlighted}
                      onPin={handlePin}
                      onDismiss={handleDismiss}
                      isActive={isActive}
                      isExpressionActive={expressionGroupOn && !isActive}
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
                      studentRequestDisabled={flagging?.saveResponses === false}
                      onToggleFlag={handleToggleFlag}
                      onRequestWord={handleRequestWord}
                      onConvertRequests={handleConvertRequests}
                      flagNote={flagNote}
                      onOpenNote={
                        flagNote ? () => setOpenNote(flagNote) : undefined
                      }
                      onSaveNote={(note) =>
                        handleSaveNote(token, occurrenceIndex, note)
                      }
                    />
                    {bridgeSpace ? gap : null}
                    </span>
                    {bridgeSpace ? null : gap}
                  </span>
                );
                    })}
                  </span>
                  );
                });
                return speakerName ? (
                  <span className="script-spoken">{spoken}</span>
                ) : (
                  spoken
                );
              })()}
            </p>
          );
        })}
      </div>
      {openNote ? (
        <NoteLightbox note={openNote} onClose={() => setOpenNote(null)} />
      ) : null}
    </div>
  );
}
