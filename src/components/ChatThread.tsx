import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient, errorMessage } from "../api.ts";
import { appendOutgoing, applyHistory } from "../chatModel.ts";
import { colorFor, formatPhone, formatTime, initial } from "../format.ts";
import { loadChatHistory, loadContactInfo } from "../history.ts";
import { IconBack, IconSend } from "../icons.tsx";
import { useSession } from "../session.tsx";
import { useChats } from "./chat-context.tsx";

export function ChatThread() {
  const { chatId: rawChatId } = useParams();
  const chatId = rawChatId ? decodeURIComponent(rawChatId) : "";
  const navigate = useNavigate();
  const { session } = useSession();
  const { chats, update, reloadChats } = useChats();
  const chat = chats.find((item) => item.chatId === chatId);
  const client = useMemo(
    () => (session ? createClient(session.idInstance, session.apiTokenInstance) : null),
    [session],
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [historyPhase, setHistoryPhase] = useState<"loading" | "ready" | "error">("loading");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  useEffect(() => {
    if (!client || !chatId) return;
    let alive = true;
    setHistoryPhase("loading");
    setError("");
    Promise.all([loadChatHistory(client, chatId), loadContactInfo(client, chatId).catch(() => null)])
      .then(([items, contact]) => {
        if (!alive) return;
        update((current) => applyHistory(current, chatId, items, contact));
        setHistoryPhase("ready");
      })
      .catch((requestError: unknown) => {
        if (!alive || (requestError instanceof Error && requestError.name === "AbortError")) return;
        setHistoryPhase("error");
        setError(errorMessage(requestError, "Не удалось загрузить историю"));
      });
    return () => {
      alive = false;
    };
  }, [chatId, client, update]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || historyPhase === "loading") return;
    const pinToEnd = () => {
      list.scrollTop = list.scrollHeight;
    };
    pinToEnd();
    const frame = requestAnimationFrame(pinToEnd);
    return () => cancelAnimationFrame(frame);
  }, [chatId, historyPhase, chat?.messages.length]);

  if (!client) return null;

  if (!chat && historyPhase === "loading") {
    return (
      <section className="thread">
        <p className="thread-empty">Загружаем историю…</p>
      </section>
    );
  }

  if (!chat) {
    return (
      <div className="missing">
        <p>{error || "Чат не найден"}</p>
        <button type="button" className="primary" onClick={() => navigate("/chats")}>
          К списку чатов
        </button>
      </div>
    );
  }

  const opened = chat;

  function resize(event: ChangeEvent<HTMLTextAreaElement>) {
    const field = event.target;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !client) return;
    if (text.length > 4000) {
      setError("Сообщение длиннее 4000 символов");
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await client.sendMessage(opened.chatId, text);
      update((current) =>
        appendOutgoing(current, opened.chatId, {
          id: result?.idMessage || `${Date.now()}`,
          text,
          timestamp: Date.now(),
        }),
      );
      setDraft("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      reloadChats();
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось отправить сообщение"));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
      <div className="messages" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
        {historyPhase === "loading" && <p className="thread-empty">Загружаем историю…</p>}
        {historyPhase === "ready" && chat.messages.length === 0 && (
          <p className="thread-empty">Текстовых сообщений пока нет</p>
        )}
        {historyPhase !== "loading" &&
          chat.messages.map((message) => (
            <article key={message.id} className={message.outgoing ? "bubble out" : "bubble in"}>
              <p>{message.text}</p>
              <span className="meta">
                <time>{formatTime(message.timestamp)}</time>
                {message.outgoing && <span aria-label="отправлено">✓</span>}
              </span>
            </article>
          ))}
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
