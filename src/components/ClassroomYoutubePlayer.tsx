"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publishYoutubeSync } from "@/app/lesson/[slug]/youtube-sync-actions";
import {
  YOUTUBE_DRIFT_SECONDS,
  YOUTUBE_TICK_EVENT,
  youtubeChannelName,
  type YoutubeLeaderState,
} from "@/lib/youtube-sync";

type YtPlayer = {
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getIframe: () => HTMLIFrameElement;
};

type YtNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onPlaybackRateChange?: (event: { data: number }) => void;
      };
    }
  ) => YtPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
};

type BroadcastChannel = {
  send: (args: {
    type: "broadcast";
    event: string;
    payload: YoutubeLeaderState;
  }) => Promise<string>;
};

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

function armedKey(sessionId: string): string {
  return `youtube-armed-${sessionId}`;
}

function loadYoutubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
    if (window.YT?.Player) resolve(window.YT);
  });
}

function readLeaderState(player: YtPlayer): YoutubeLeaderState {
  const playerState = player.getPlayerState();
  return {
    playing: playerState === PLAYING,
    seconds: player.getCurrentTime(),
    rate: player.getPlaybackRate(),
  };
}

export default function ClassroomYoutubePlayer({
  videoId,
  title,
  sessionId,
  isTeacher,
  live,
}: {
  videoId: string;
  title: string;
  sessionId?: string;
  isTeacher: boolean;
  live: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const leaderRef = useRef<YoutubeLeaderState>({
    playing: false,
    seconds: 0,
    rate: 1,
  });
  const applyingRef = useRef(false);
  const liveRef = useRef(live);
  const teacherRef = useRef(isTeacher);
  const armedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  liveRef.current = live;
  teacherRef.current = isTeacher;
  const showControls = !live || isTeacher;
  const studentLock = live && !isTeacher;

  const [armed, setArmed] = useState(() => {
    if (!live || isTeacher || !sessionId) return true;
    try {
      return sessionStorage.getItem(armedKey(sessionId)) === "1";
    } catch {
      return false;
    }
  });
  armedRef.current = !studentLock || armed;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const applyToPlayer = useCallback((state: YoutubeLeaderState) => {
    const player = playerRef.current;
    if (!player) return;
    applyingRef.current = true;
    try {
      const now = player.getCurrentTime();
      if (Math.abs(now - state.seconds) > YOUTUBE_DRIFT_SECONDS) {
        player.seekTo(state.seconds, true);
      }
      if (player.getPlaybackRate() !== state.rate) {
        player.setPlaybackRate(state.rate);
      }
      const playerState = player.getPlayerState();
      if (state.playing) {
        if (playerState !== PLAYING) player.playVideo();
      } else if (playerState !== PAUSED && playerState !== ENDED) {
        player.pauseVideo();
      }
    } finally {
      window.setTimeout(() => {
        applyingRef.current = false;
      }, 400);
    }
  }, []);

  const publish = useCallback(
    (state: YoutubeLeaderState) => {
      leaderRef.current = state;
      if (!sessionId || !teacherRef.current || !liveRef.current) return;
      void channelRef.current?.send({
        type: "broadcast",
        event: YOUTUBE_TICK_EVENT,
        payload: state,
      });
      void publishYoutubeSync({
        sessionId,
        playing: state.playing,
        seconds: state.seconds,
        rate: state.rate,
      });
    },
    [sessionId]
  );

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YtPlayer | null = null;

    void loadYoutubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          mute: studentLock ? 1 : 0,
          controls: showControls ? 1 : 0,
          disablekb: showControls ? 0 : 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const current = playerRef.current;
            if (!current) return;
            try {
              const iframe = current.getIframe();
              iframe.setAttribute("allowfullscreen", "true");
              iframe.setAttribute(
                "allow",
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              );
            } catch {
              /* iframe not ready */
            }
            if (studentLock && !armedRef.current) current.mute();
            if (studentLock) applyToPlayer(leaderRef.current);
          },
          onStateChange: (event) => {
            if (!teacherRef.current || !liveRef.current) return;
            if (applyingRef.current) return;
            if (
              event.data !== PLAYING &&
              event.data !== PAUSED &&
              event.data !== ENDED
            ) {
              return;
            }
            const current = playerRef.current;
            if (!current) return;
            publish(readLeaderState(current));
          },
          onPlaybackRateChange: () => {
            if (!teacherRef.current || !liveRef.current) return;
            const current = playerRef.current;
            if (!current) return;
            publish(readLeaderState(current));
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        /* YouTube may already have removed the node */
      }
    };
  }, [videoId, showControls, studentLock, publish, applyToPlayer]);

  useEffect(() => {
    if (!live || !sessionId) return;
    const supabase = createClient();

    function takeLeader(state: YoutubeLeaderState) {
      leaderRef.current = {
        playing: Boolean(state.playing),
        seconds: Number(state.seconds) || 0,
        rate: Number(state.rate) || 1,
      };
      if (teacherRef.current) return;
      applyToPlayer(leaderRef.current);
    }

    void supabase
      .from("course_sessions")
      .select("video_playing, video_seconds, video_rate")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        takeLeader({
          playing: Boolean(data.video_playing),
          seconds: Number(data.video_seconds) || 0,
          rate: Number(data.video_rate) || 1,
        });
      });

    const channel = supabase
      .channel(youtubeChannelName(sessionId), {
        config: { broadcast: { self: false } },
      })
      .on(
        "broadcast",
        { event: YOUTUBE_TICK_EVENT },
        (message) => {
          const payload = message.payload as YoutubeLeaderState;
          takeLeader(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "course_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            video_playing?: boolean;
            video_seconds?: number;
            video_rate?: number;
          };
          takeLeader({
            playing: Boolean(row.video_playing),
            seconds: Number(row.video_seconds) || 0,
            rate: Number(row.video_rate) || 1,
          });
        }
      )
      .subscribe();
    channelRef.current = channel;

    const tick = teacherRef.current
      ? window.setInterval(() => {
          const current = playerRef.current;
          if (!current) return;
          const state = readLeaderState(current);
          leaderRef.current = state;
          void channel.send({
            type: "broadcast",
            event: YOUTUBE_TICK_EVENT,
            payload: state,
          });
        }, 2000)
      : null;

    return () => {
      channelRef.current = null;
      if (tick) window.clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [live, sessionId, applyToPlayer]);

  function armAudio() {
    const player = playerRef.current;
    const leader = leaderRef.current;
    if (!player) return;
    try {
      player.unMute();
      applyToPlayer(leader);
    } catch {
      /* first gesture still counts for later play() */
    }
    setArmed(true);
    if (sessionId) {
      try {
        sessionStorage.setItem(armedKey(sessionId), "1");
      } catch {
        /* private mode */
      }
    }
  }

  useEffect(() => {
    function syncFullscreen() {
      const node = frameRef.current;
      const active =
        document.fullscreenElement ??
        (document as Document & { webkitFullscreenElement?: Element })
          .webkitFullscreenElement;
      setIsFullscreen(Boolean(node && active === node));
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  async function toggleFullscreen() {
    const node = frameRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => void })
      | null;
    if (!node) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    const active = document.fullscreenElement ?? doc.webkitFullscreenElement;
    try {
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else doc.webkitExitFullscreen?.();
        return;
      }
      if (node.requestFullscreen) await node.requestFullscreen();
      else node.webkitRequestFullscreen?.();
    } catch {
      /* iOS may ignore element fullscreen; YouTube iframe still has allowfullscreen */
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-paper-line bg-text-primary">
      <div
        ref={frameRef}
        className="classroom-youtube-frame relative aspect-video w-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full"
      >
        <div ref={mountRef} className="absolute inset-0 h-full w-full" />
        {studentLock ? (
          <button
            type="button"
            className={`absolute inset-0 z-10 ${
              armed ? "cursor-default bg-transparent" : "bg-text-primary/60"
            }`}
            onClick={
              armed
                ? (event) => {
                    event.preventDefault();
                  }
                : armAudio
            }
            aria-label={armed ? undefined : "Toca el video para oír"}
            aria-hidden={armed}
            tabIndex={armed ? -1 : 0}
          >
            {armed ? null : (
              <span className="flex h-full items-center justify-center px-4 text-center text-label-md font-medium text-white">
                Toca el video para oír.
              </span>
            )}
          </button>
        ) : null}
        {studentLock ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void toggleFullscreen();
            }}
            className="absolute right-3 bottom-3 z-20 flex h-12 w-12 items-center justify-center rounded-card bg-text-primary/70 text-white"
            aria-label={
              isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
          >
            {isFullscreen ? (
              <Minimize2 size={22} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Maximize2 size={22} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
