"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TeacherPanelState = {
  content: ReactNode | null;
  setPanel: (content: ReactNode | null) => void;
};

const TeacherPanelContext = createContext<TeacherPanelState | null>(null);

export function TeacherPanelProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);
  const setPanel = useCallback((next: ReactNode | null) => {
    setContent(next);
  }, []);
  const value = useMemo(
    () => ({ content, setPanel }),
    [content, setPanel]
  );

  return (
    <TeacherPanelContext.Provider value={value}>
      {children}
    </TeacherPanelContext.Provider>
  );
}

export function useTeacherPanel(): TeacherPanelState {
  const ctx = useContext(TeacherPanelContext);
  if (!ctx) {
    throw new Error("useTeacherPanel must be used within TeacherPanelProvider");
  }
  return ctx;
}
