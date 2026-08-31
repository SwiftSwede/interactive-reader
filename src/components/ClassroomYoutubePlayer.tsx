"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      if (state.playing && playerState !== PLAYING) {
        player.playVideo();
      }
      if (!state.playing && playerState === PLAYING) {
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
          controls: showControls ? 1 : 0,
          disablekb: showControls ? 0 : 1,
          fs: showControls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
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
            publish({
              playing: event.data === PLAYING,
              seconds: current.getCurrentTime(),
              rate: current.getPlaybackRate(),
            });
          },
          onPlaybackRateChange: (event) => {
            if (!teacherRef.current || !liveRef.current) return;
            const current = playerRef.current;
            if (!current) return;
            publish({
              playing: current.getPlayerState() === PLAYING,
              seconds: current.getCurrentTime(),
              rate: event.data,
            });
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
  }, [videoId, showControls, publish]);

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
      if (!armedRef.current) return;
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

    const tick = teacherRef.current
      ? window.setInterval(() => {
          const current = playerRef.current;
          if (!current) return;
          if (current.getPlayerState() !== PLAYING) return;
          const state: YoutubeLeaderState = {
            playing: true,
            seconds: current.getCurrentTime(),
            rate: current.getPlaybackRate(),
          };
          leaderRef.current = state;
          void channel.send({
            type: "broadcast",
            event: YOUTUBE_TICK_EVENT,
            payload: state,
          });
        }, 2000)
      : null;

    return () => {
      if (tick) window.clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [live, sessionId, applyToPlayer]);

  function armAudio() {
    const player = playerRef.current;
    const leader = leaderRef.current;
    if (!player) return;
    try {
      player.mute();
      player.playVideo();
      player.seekTo(leader.seconds, true);
      player.setPlaybackRate(leader.rate);
      if (!leader.playing) {
        player.pauseVideo();
      }
      player.unMute();
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

  return (
    <div className="overflow-hidden rounded-card border border-paper-line bg-text-primary">
        <div className="relative aspect-video w-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full">
        <div
          ref={mountRef}
          className="absolute inset-0 h-full w-full"
        />
        {studentLock ? (
          <button
            type="button"
            className={`absolute inset-0 z-10 ${
              armed
                ? "cursor-default bg-transparent"
                : "bg-text-primary/60"
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
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
