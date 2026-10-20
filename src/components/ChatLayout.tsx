import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { activeChatIdFrom } from "../routes.ts";
import { useSession } from "../session.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { useChats } from "./chat-context.tsx";
import { IconRail } from "./IconRail.tsx";

export function ChatLayout() {
  const { session, logout } = useSession();
  const { chats, pollError, showRestart, dismissRestart } = useChats();
  const navigate = useNavigate();
  const location = useLocation();
  const activeChatId = activeChatIdFrom(location);

  useEffect(() => {
    const chat = chats.find((item) => item.chatId === activeChatId);
    document.title = chat ? `${chat.title} — Чаты` : "Чаты";
  }, [activeChatId, chats]);

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!session) return null;

  return (
    <div className={activeChatId ? "app has-chat" : "app"}>
      <IconRail session={session} onLogout={onLogout} />
      <ChatSidebar activeChatId={activeChatId} onLogout={onLogout} />
      <section className="stage">
        <div className="pattern" aria-hidden="true" />
        {showRestart && (
          <p className="banner">
            Включены входящие уведомления. Инстанс может перезапуститься, ответы появятся в течение
            нескольких минут.
            <button type="button" onClick={dismissRestart}>
              Скрыть
            </button>
          </p>
        )}
        {pollError && (
          <p className="banner warn">Не удаётся получить новые сообщения. Повтор через несколько секунд.</p>
        )}
        <Outlet />
      </section>
    </div>
  );
}
