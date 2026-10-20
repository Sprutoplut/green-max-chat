import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient } from "../api.js";
import { appendOutgoing } from "../chatModel.js";
import { colorFor, formatPhone, formatTime, initial } from "../format.js";
import { IconBack, IconSend } from "../icons.jsx";
import { useSession } from "../session.jsx";
import { useChats } from "./chat-context.jsx";

export function ChatThread() {
  const { chatId: rawChatId } = useParams();
  const chatId = rawChatId ? decodeURIComponent(rawChatId) : "";
  const navigate = useNavigate();
  const { session } = useSession();
  const { chats, update } = useChats();
  const chat = chats.find((item) => item.chatId === chatId);
  const client = useMemo(
    () => createClient(session.idInstance, session.apiTokenInstance),
    [session.idInstance, session.apiTokenInstance],
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages.length]);

  if (!chat) {
    return (
      <div className="missing">
        <p>Чат не найден</p>
        <button type="button" className="primary" onClick={() => navigate("/chats")}>
          К списку чатов
        </button>
      </div>
    );
  }

  function resize(event) {
    const field = event.target;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
  }

  async function onSubmit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (text.length > 4000) {
      setError("Сообщение длиннее 4000 символов");
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await client.sendMessage(chat.chatId, text);
      update((current) =>
        appendOutgoing(current, chat.chatId, {
          id: result?.idMessage || `${Date.now()}`,
          text,
          timestamp: Date.now(),
        }),
      );
      setDraft("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch (requestError) {
      setError(requestError.message || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="thread">
      <header className="thread-head">
        <button className="back" type="button" onClick={() => navigate("/chats")} aria-label="К списку чатов">
          <IconBack />
        </button>
        <span className="avatar" style={{ background: colorFor(chat.chatId) }}>
          {initial(chat.title)}
        </span>
        <span>
          <strong>{chat.title}</strong>
          <small>{formatPhone(chat.phone) || "личный чат"}</small>
        </span>
      </header>
      <div className="messages" role="log" aria-live="polite" aria-relevant="additions">
        {chat.messages.length === 0 && <p className="thread-empty">Напишите первое сообщение</p>}
        {chat.messages.map((message) => (
          <article key={message.id} className={message.outgoing ? "bubble out" : "bubble in"}>
            <p>{message.text}</p>
            <span className="meta">
              <time>{formatTime(message.timestamp)}</time>
              {message.outgoing && <span aria-label="отправлено">✓</span>}
            </span>
          </article>
        ))}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          placeholder="Сообщение"
          aria-label="Сообщение"
          maxLength={4000}
          onChange={(event) => {
            setDraft(event.target.value);
            resize(event);
          }}
          onKeyDown={onKeyDown}
        />
        <button className="send" type="submit" disabled={sending || !draft.trim()} aria-label="Отправить">
          <IconSend />
        </button>
        {error && <p className="form-error composer-error">{error}</p>}
      </form>
    </section>
  );
}
