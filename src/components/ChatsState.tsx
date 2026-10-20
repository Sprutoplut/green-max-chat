import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { createClient } from "../api.ts";
import { applyApiChats, applyContact, applyIncoming, chatsFromApiJournal, incomingText, markRead } from "../chatModel.ts";
import { loadApiChats, loadContactInfo } from "../history.ts";
import { startPolling } from "../poll.ts";
import { activeChatIdFrom } from "../routes.ts";
import { useSession } from "../session.tsx";
import { clearStoredChats } from "../storage.ts";
import type { AppLocationState, Chat } from "../types.ts";
import { ChatProvider } from "./chat-context.tsx";

export function ChatsState({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  const activeChatId = activeChatIdFrom(location);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [pollError, setPollError] = useState(false);
  const [showRestart, setShowRestart] = useState(Boolean((location.state as AppLocationState | null)?.restarting));
  const activeRef = useRef(activeChatId);
  const reloadToken = useRef(0);
  activeRef.current = activeChatId;

  const update = useCallback((updater: (current: Chat[]) => Chat[]) => {
    setChats((current) => updater(current));
  }, []);

  const reloadChats = useCallback(() => {
    if (!session) {
      setChatsLoading(false);
      return;
    }
    const token = ++reloadToken.current;
    const client = createClient(session.idInstance, session.apiTokenInstance);
    clearStoredChats(session.idInstance);
    loadApiChats(client)
      .then((items) => {
        if (token !== reloadToken.current) return [];
        const remote = chatsFromApiJournal(items);
        update((current) => applyApiChats(current, remote));
        return remote;
      })
      .then(async (remote) => {
        for (const chat of remote) {
          if (token !== reloadToken.current) return;
          const info = await loadContactInfo(client, chat.chatId).catch(() => null);
          if (token !== reloadToken.current) return;
          update((current) => applyContact(current, chat.chatId, info));
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (token === reloadToken.current) setChatsLoading(false);
      });
  }, [session, update]);

  useEffect(() => {
    reloadChats();
  }, [reloadChats]);

  useEffect(() => {
    if (!activeChatId) return;
    update((current) => markRead(current, activeChatId));
  }, [activeChatId, update]);

  useEffect(() => {
    if (!session) return;
    const client = createClient(session.idInstance, session.apiTokenInstance);
    return startPolling(client, {
      onBody(body) {
        const incoming = incomingText(body);
        if (!incoming) return;
        update((current) => applyIncoming(current, incoming, activeRef.current));
      },
      onError() {
        setPollError(true);
      },
      onSuccess() {
        setPollError(false);
      },
    });
  }, [session, update]);

  if (!session) return null;

  return (
    <ChatProvider value={{ chats, chatsLoading, reloadChats, update, pollError, showRestart, dismissRestart: () => setShowRestart(false) }}>
      {children}
    </ChatProvider>
  );
}
