import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createClient } from "../api.js";
import { ensureChat } from "../chatModel.js";
import { formatPhone, normalizePhone } from "../format.js";
import { useSession } from "../session.jsx";
import { useChats } from "./chat-context.jsx";

export function NewChatModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession();
  const { update } = useChats();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const digits = normalizePhone(phone);

  function close() {
    const back = location.state?.background?.pathname;
    navigate(back && back !== "/chats/new" ? back : "/chats");
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key !== "Escape") return;
      const back = location.state?.background?.pathname;
      navigate(back && back !== "/chats/new" ? back : "/chats");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.state, navigate]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!digits) {
      setError("Нужен номер России (11 цифр с 7) или Беларуси (12 цифр с 375)");
      return;
    }
    setPending(true);
    setError("");
    try {
      const client = createClient(session.idInstance, session.apiTokenInstance);
      const result = await client.checkAccount(digits);
      if (result?.status === false) {
        throw new Error(result.reason || "Не удалось проверить номер");
      }
      if (!result?.exist || !result.chatId) {
        throw new Error("На этом номере нет аккаунта MAX");
      }
      const chatId = String(result.chatId);
      update((chats) =>
        ensureChat(chats, {
          chatId,
          phone: digits,
          title: formatPhone(digits),
        }),
      );
      navigate(`/chats/${encodeURIComponent(chatId)}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Не удалось создать чат");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close} role="presentation">
      <form
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h2>Новый чат</h2>
        <label>
          Номер телефона
          <input
            autoFocus
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            placeholder="79001234567"
            aria-label="Номер телефона"
          />
        </label>
        <p className="hint">
          {digits
            ? `Будет проверен номер ${formatPhone(digits)}`
            : "Россия: 11 цифр, начиная с 7. Беларусь: 12 цифр, начиная с 375. Номер с 8 в начале будет заменён на 7."}
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={close}>
            Отмена
          </button>
          <button className="primary" type="submit" disabled={pending}>
            {pending ? "Проверяем…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
