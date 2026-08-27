"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SoundVideo } from "@/types";
import SoundVideoModal from "./SoundVideoModal";

type SoundVideoContextValue = {
  videos: SoundVideo[];
  openVideo: (video: SoundVideo) => void;
};

const SoundVideoContext = createContext<SoundVideoContextValue>({
  videos: [],
  openVideo: () => {},
});

export function useSoundVideos() {
  return useContext(SoundVideoContext);
}

export default function SoundVideoProvider({
  videos,
  children,
}: {
  videos: SoundVideo[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<SoundVideo | null>(null);

  const openVideo = useCallback((video: SoundVideo) => {
    setActive(video);
  }, []);

  const value = useMemo(
    () => ({ videos, openVideo }),
    [videos, openVideo]
  );

  return (
    <SoundVideoContext.Provider value={value}>
      {children}
      <SoundVideoModal video={active} onClose={() => setActive(null)} />
    </SoundVideoContext.Provider>
  );
}
