import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createClient } from "../api.js";
import { applyIncoming, incomingText, markRead } from "../chatModel.js";
import { startPolling } from "../poll.js";
import { activeChatIdFrom } from "../routes.js";
import { useSession } from "../session.jsx";
import { loadChats, saveChats } from "../storage.js";
import { ChatProvider } from "./chat-context.jsx";

export function ChatsState({ children }) {
  const { session } = useSession();
  const location = useLocation();
  const activeChatId = activeChatIdFrom(location);
  const [chats, setChats] = useState(() => loadChats(session.idInstance));
  const [pollError, setPollError] = useState(false);
  const [showRestart, setShowRestart] = useState(Boolean(location.state?.restarting));
  const activeRef = useRef(activeChatId);
  activeRef.current = activeChatId;

  const update = useCallback((updater) => {
    setChats((current) => updater(current));
  }, []);

  useEffect(() => {
    saveChats(session.idInstance, chats);
  }, [chats, session.idInstance]);

  useEffect(() => {
    if (!activeChatId) return;
    update((current) => markRead(current, activeChatId));
  }, [activeChatId, update]);

  useEffect(() => {
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
  }, [session.idInstance, session.apiTokenInstance, update]);

  return (
    <ChatProvider value={{ chats, update, pollError, showRestart, dismissRestart: () => setShowRestart(false) }}>
      {children}
    </ChatProvider>
  );
}
