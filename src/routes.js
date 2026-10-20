export function activeChatIdFrom(location) {
  const pathname = location.state?.background?.pathname || location.pathname || "";
  const match = pathname.match(/^\/chats\/([^/]+)$/);
  if (!match) return null;
  const chatId = decodeURIComponent(match[1]);
  return chatId === "new" ? null : chatId;
}
