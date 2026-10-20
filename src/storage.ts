import type { Session } from "./types.ts";

const SESSION_KEY = "green-max-session";

function isSession(data: unknown): data is Partial<Session> & Pick<Session, "idInstance" | "apiTokenInstance"> {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<Session>;
  return typeof value.idInstance === "string" && typeof value.apiTokenInstance === "string" && Boolean(value.idInstance && value.apiTokenInstance);
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isSession(data)) return null;
    return {
      idInstance: data.idInstance,
      apiTokenInstance: data.apiTokenInstance,
      phone: data.phone || "",
      selfChatId: data.selfChatId || "",
      avatar: data.avatar || "",
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function clearStoredChats(idInstance: string) {
  localStorage.removeItem(`green-max-chats:${idInstance}`);
}
