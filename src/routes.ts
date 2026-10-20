import type { Location } from "react-router-dom";
import type { AppLocationState } from "./types.ts";

export function activeChatIdFrom(location: Location) {
  const state = location.state as AppLocationState | null;
  const pathname = state?.background?.pathname || location.pathname || "";
  const match = pathname.match(/^\/chats\/([^/]+)$/);
  if (!match) return null;
  const chatId = decodeURIComponent(match[1]);
  return chatId === "new" ? null : chatId;
}
