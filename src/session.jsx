import { createContext, useContext, useMemo, useState } from "react";
import { clearSession, loadSession, saveSession } from "./storage.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const value = useMemo(
    () => ({
      session,
      login(next) {
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
