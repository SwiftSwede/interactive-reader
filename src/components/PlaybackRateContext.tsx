"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PlaybackRate = 1 | 0.75;

type PlaybackRateContextValue = {
  rate: PlaybackRate;
  toggle: () => void;
};

const PlaybackRateContext = createContext<PlaybackRateContextValue>({
  rate: 1,
  toggle: () => {},
});

export function PlaybackRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<PlaybackRate>(1);
  const toggle = useCallback(() => {
    setRate((current) => (current === 1 ? 0.75 : 1));
  }, []);
  const value = useMemo(() => ({ rate, toggle }), [rate, toggle]);

  return (
    <PlaybackRateContext.Provider value={value}>
      {children}
    </PlaybackRateContext.Provider>
  );
}

export function usePlaybackRate() {
  return useContext(PlaybackRateContext);
}
