import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { markRead } from "../chatModel.js";
import { activeChatIdFrom } from "../routes.js";
import { useSession } from "../session.jsx";
import { loadChats, saveChats } from "../storage.js";
import { ChatProvider } from "./chat-context.jsx";

export function ChatsState({ children }) {
  const { session } = useSession();
  const location = useLocation();
  const activeChatId = activeChatIdFrom(location);
  const [chats, setChats] = useState(() => loadChats(session.idInstance));
  const [showRestart, setShowRestart] = useState(Boolean(location.state?.restarting));

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

  return (
    <ChatProvider value={{ chats, update, pollError: false, showRestart, dismissRestart: () => setShowRestart(false) }}>
      {children}
    </ChatProvider>
  );
}
