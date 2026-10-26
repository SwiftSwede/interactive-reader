"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TeacherPanelState = {
  content: ReactNode | null;
  setPanel: (content: ReactNode | null, onClose?: () => void) => void;
  closePanel: () => void;
};

const TeacherPanelContext = createContext<TeacherPanelState | null>(null);

export function TeacherPanelProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  const setPanel = useCallback(
    (next: ReactNode | null, onClose?: () => void) => {
      onCloseRef.current = next ? (onClose ?? null) : null;
      setContent(next);
    },
    []
  );

  const closePanel = useCallback(() => {
    const onClose = onCloseRef.current;
    onCloseRef.current = null;
    setContent(null);
    onClose?.();
  }, []);

  const value = useMemo(
    () => ({ content, setPanel, closePanel }),
    [content, setPanel, closePanel]
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
