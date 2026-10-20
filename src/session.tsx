import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearSession, loadSession, saveSession } from "./storage.ts";
import type { Session } from "./types.ts";

type SessionContextValue = {
  session: Session | null;
  login: (next: Session) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const value = useMemo(
    () => ({
      session,
      login(next: Session) {
        saveSession(next);
        setSession(next);
      },
      logout() {
        clearSession();
        setSession(null);
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Сессия не подключена");
  return value;
}
