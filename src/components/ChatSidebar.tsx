import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatPreview, sortChats } from "../chatModel.ts";
import { colorFor, formatPhone, formatTime, initial } from "../format.ts";
import { IconPlus, IconSearch } from "../icons.tsx";
import { useSession } from "../session.tsx";
import { useChats } from "./chat-context.tsx";

export function ChatSidebar({ activeChatId }: { activeChatId: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession();
  const { chats, chatsLoading } = useChats();
  const [query, setQuery] = useState("");
  const added = useMemo(() => chats.filter((chat) => chat.fromApi), [chats]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortChats(added).filter((chat) => {
      if (!needle) return true;
      const phone = formatPhone(chat.phone).toLowerCase();
      return chat.title.toLowerCase().includes(needle) || phone.includes(needle) || chat.phone.includes(needle);
    });
  }, [added, query]);

  function openNewChat() {
    if (location.pathname === "/chats/new") return;
    navigate("/chats/new", {
      state: {
        background: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    });
  }

  if (!session) return null;

  return (
    <aside className="sidebar">
      <header className="side-head">
        <div>
          <h1>
            Чаты <span className="count">{added.length}</span>
          </h1>
          <p className="me-phone">{formatPhone(session.phone) || "Аккаунт MAX"}</p>
        </div>
        <button className="plus" type="button" onClick={openNewChat} aria-label="Новый чат" title="Новый чат">
          <IconPlus />
        </button>
      </header>
      <label className="search">
        <IconSearch />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти"
          aria-label="Найти"
        />
      </label>
      <div className="chat-list">
        {visible.length === 0 && (
          <p className="empty-list">
            {chatsLoading && added.length === 0
              ? "Загружаем чаты…"
              : added.length === 0
                ? "Нет чатов, которым вы написали через API. Нажмите + и отправьте сообщение."
                : "Ничего не найдено"}
          </p>
        )}
        {visible.map((chat) => {
          const message = chat.messages[chat.messages.length - 1];
          const active = chat.chatId === activeChatId;
          return (
            <button
              key={chat.chatId}
              type="button"
              className={active ? "chat-row active" : "chat-row"}
              onClick={() => navigate(`/chats/${encodeURIComponent(chat.chatId)}`)}
            >
              <span className="avatar" style={{ background: colorFor(chat.chatId) }}>
                {initial(chat.title)}
              </span>
              <span className="chat-copy">
                <span className="chat-title">
                  <strong>{chat.title}</strong>
                  {message && <time>{formatTime(message.timestamp)}</time>}
                </span>
                <span className="chat-preview">
                  <span>{chatPreview(chat)}</span>
                  {chat.unread > 0 && <em>{chat.unread}</em>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
