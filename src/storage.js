const SESSION_KEY = "green-max-session";

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.idInstance || !data?.apiTokenInstance) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function chatsKey(idInstance) {
  return `green-max-chats:${idInstance}`;
}

export function loadChats(idInstance) {
  try {
    const raw = localStorage.getItem(chatsKey(idInstance));
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveChats(idInstance, chats) {
  localStorage.setItem(chatsKey(idInstance), JSON.stringify(chats));
}
