import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Languages,
  Lock,
  MessagesSquare,
  Mic,
  MonitorPlay,
  PenLine,
} from "lucide-react";
import { sessionTypeLabel, type SessionType } from "@/lib/activities";
import { formatSessionDay, liveOnlyRecordingHref } from "@/lib/dashboard";
import type { SessionLifecycle } from "@/lib/session-phase";

type LessonCardProps = {
  sessionType: SessionType;
  title: string | null;
  lifecycle: SessionLifecycle;
  completed: boolean;
  hasRecording: boolean;
  recordingYoutubeUrl?: string | null;
  sessionDate: string;
  href: string | null;
  liveOnly: boolean;
};

function TypeIcon({ type }: { type: SessionType }) {
  const className = "h-5 w-5 shrink-0 text-text-secondary";
  if (type === "writing") return <PenLine className={className} aria-hidden="true" />;
  if (type === "exam") return <FileText className={className} aria-hidden="true" />;
  if (type === "video_summary") {
    return <Languages className={className} aria-hidden="true" />;
  }
  if (type === "presentation") {
    return <MonitorPlay className={className} aria-hidden="true" />;
  }
  if (type === "conversation") {
    return <MessagesSquare className={className} aria-hidden="true" />;
  }
  if (type === "pronunciation") return <Mic className={className} aria-hidden="true" />;
  return <BookOpen className={className} aria-hidden="true" />;
}

function statusCopy(props: LessonCardProps): { line: string; extra?: string } {
  const typeLabel = sessionTypeLabel(props.sessionType);
  const date = formatSessionDay(props.sessionDate);

  if (props.liveOnly) {
    if (props.lifecycle === "live") {
      return { line: "EN VIVO · por Zoom" };
    }
    if (props.lifecycle === "after") {
      return { line: `Clase terminada · ${date}` };
    }
    return { line: `${typeLabel} · En vivo por Zoom · ${date}` };
  }

  if (props.lifecycle === "placeholder") {
    return { line: `Próximamente · ${date}` };
  }
  if (props.lifecycle === "live") {
    return { line: "EN VIVO · entra ahora" };
  }
  if (props.lifecycle === "after") {
    if (props.hasRecording) {
      return { line: "Grabación disponible" };
    }
    return {
      line: `Completada · ${date}`,
      extra: "La grabación llega pronto",
    };
  }
  return { line: `Sin empezar · ${date}` };
}

function StatusMark({ props }: { props: LessonCardProps }) {
  if (props.liveOnly) {
    if (props.lifecycle === "live") {
      return (
        <span
          className="live-dot-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
          aria-hidden="true"
        />
      );
    }
    if (props.lifecycle === "after") {
      return (
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      );
    }
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-text-secondary"
        aria-hidden="true"
      />
    );
  }

  if (props.lifecycle === "placeholder") {
    return <Lock className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />;
  }
  if (props.lifecycle === "live") {
    return (
      <span
        className="live-dot-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
        aria-hidden="true"
      />
    );
  }
  if (props.lifecycle === "after") {
    return <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />;
  }
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border border-text-secondary"
      aria-hidden="true"
    />
  );
}

export default function LessonCard(props: LessonCardProps) {
  const typeLabel = sessionTypeLabel(props.sessionType);
  const heading = props.title ?? typeLabel;
  const status = statusCopy(props);
  const tappable = Boolean(props.href);
  const recordingHref = liveOnlyRecordingHref(props);
  const className =
    "flex items-center gap-3 rounded-card border border-paper-line bg-surface p-3 text-left";

  const inner = (
    <>
      <TypeIcon type={props.sessionType} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-base font-semibold text-text-primary">
          {heading}
        </p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-[12px] text-text-secondary">
          <StatusMark props={props} />
          <span className="min-w-0 truncate">{status.line}</span>
        </p>
        {status.extra ? (
          <p className="truncate text-[12px] text-text-muted">{status.extra}</p>
        ) : null}
        {recordingHref ? (
          <a
            href={recordingHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center text-[12px] text-text-accent underline-offset-2 hover:underline"
          >
            Ver la grabación
          </a>
        ) : null}
      </div>
      {tappable ? (
        <ChevronRight
          className="h-5 w-5 shrink-0 text-text-muted"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (props.href) {
    return (
      <Link href={props.href} className={`${className} hover:bg-surface-hover`}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
