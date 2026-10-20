import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatPreview, sortChats } from "../chatModel.js";
import { colorFor, formatPhone, formatTime, initial } from "../format.js";
import { IconPlus, IconSearch } from "../icons.jsx";
import { useSession } from "../session.jsx";
import { useChats } from "./chat-context.jsx";

export function ChatSidebar({ activeChatId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession();
  const { chats } = useChats();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortChats(chats).filter((chat) => {
      if (!needle) return true;
      const phone = formatPhone(chat.phone).toLowerCase();
      return chat.title.toLowerCase().includes(needle) || phone.includes(needle) || chat.phone.includes(needle);
    });
  }, [chats, query]);

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

  return (
    <aside className="sidebar">
      <header className="side-head">
        <div>
          <h1>
            Чаты <span className="count">{chats.length}</span>
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
            {chats.length === 0
              ? "Чатов пока нет. Нажмите +, введите номер и отправьте сообщение."
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
