"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, CircleHelp } from "lucide-react";
import LocalDateTime from "@/components/LocalDateTime";
import {
  loadSessionQuestionRequests,
  markQuestionTaught,
} from "@/app/teacher/question-request-actions";
import {
  QUESTION_SURFACE_LABELS,
  unaddressedCount,
  type QuestionRequest,
} from "@/lib/question-requests";

const POLL_MS = 5000;

export default function SessionQuestionQueue({
  sessionId,
  initialRequests,
}: {
  sessionId: string;
  initialRequests: QuestionRequest[];
}) {
  const panelId = useId();
  const initialOpen = unaddressedCount(initialRequests) > 0;
  const [open, setOpen] = useState(initialOpen);
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const unaddressed = unaddressedCount(requests);
  const hadUnaddressed = useRef(initialOpen);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  useEffect(() => {
    async function pull() {
      if (document.visibilityState !== "visible") return;
      const result = await loadSessionQuestionRequests({ sessionId });
      if (result.ok) setRequests(result.requests);
    }

    const id = window.setInterval(() => {
      void pull();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    const waiting = unaddressed > 0;
    if (waiting && !hadUnaddressed.current) setOpen(true);
    hadUnaddressed.current = waiting;
  }, [unaddressed]);

  async function markTaught(requestId: string) {
    setPendingId(requestId);
    setError("");
    const result = await markQuestionTaught({ sessionId, requestId });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const stamped = new Date().toISOString();
    setRequests((current) =>
      current.map((row) =>
        row.id === requestId ? { ...row, addressedAt: stamped } : row
      )
    );
  }

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div className="session-preguntas">
      <button
        type="button"
        className="session-preguntas-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="session-preguntas-title">Preguntas</span>
        <span
          className="session-preguntas-count"
          data-pending={unaddressed > 0 ? "true" : "false"}
        >
          {unaddressed}
        </span>
        <span className="session-preguntas-chevron">
          <Chevron className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{open ? "Ocultar" : "Ver"}</span>
        </span>
      </button>
      <div
        id={panelId}
        className="session-preguntas-panel"
        data-open={open ? "true" : "false"}
        inert={!open}
        aria-hidden={!open}
      >
        <div className="session-preguntas-clip">
          <div className="session-preguntas-body">
            {requests.length === 0 ? (
              <div className="session-preguntas-empty">
                <CircleHelp className="h-8 w-8" aria-hidden="true" />
                <p>Todavía no hay preguntas.</p>
              </div>
            ) : (
              <ul className="session-preguntas-list">
                {requests.map((row) => {
                  const addressed = row.addressedAt != null;
                  return (
                    <li
                      key={row.id}
                      className="session-preguntas-item"
                      data-addressed={addressed ? "true" : "false"}
                    >
                      <p className="session-preguntas-name">{row.studentName}</p>
                      <p className="session-preguntas-phrase">{row.body}</p>
                      <p className="session-preguntas-meta">
                        <span>{QUESTION_SURFACE_LABELS[row.surface]}</span>
                        <span aria-hidden="true"> · </span>
                        <LocalDateTime
                          iso={row.createdAt}
                          className="inline text-label-sm text-text-muted"
                        />
                      </p>
                      {addressed ? (
                        <p className="session-preguntas-done">Enseñada</p>
                      ) : (
                        <button
                          type="button"
                          className="session-preguntas-teach"
                          disabled={pendingId === row.id}
                          onClick={() => void markTaught(row.id)}
                        >
                          {pendingId === row.id ? "Guardando..." : "Enseñada"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {error ? (
              <p className="mt-3 text-label-sm text-error">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
