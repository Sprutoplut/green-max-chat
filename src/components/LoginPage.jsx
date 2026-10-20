import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectInstance } from "../api.js";
import { useSession } from "../session.jsx";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [idInstance, setIdInstance] = useState("");
  const [apiTokenInstance, setApiTokenInstance] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Вход — Чаты";
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    const id = idInstance.trim();
    const token = apiTokenInstance.trim();
    if (!/^\d+$/.test(id) || !token) {
      setError("Введите idInstance и apiTokenInstance из личного кабинета GREEN-API");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await connectInstance(id, token);
      login(result.session);
      navigate("/chats", { replace: true, state: { restarting: result.restarting } });
    } catch (requestError) {
      setError(requestError.message || "Не удалось войти");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <div className="pattern" aria-hidden="true" />
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Вход в чат</h1>
        <p className="lead">
          Укажите данные инстанса GREEN-API. Адрес API уже задан: https://api.green-api.com
        </p>
        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            spellCheck="false"
            required
          />
        </label>
        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            type={showToken ? "text" : "password"}
            autoComplete="off"
            spellCheck="false"
            required
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showToken}
            onChange={(event) => setShowToken(event.target.checked)}
          />
          Показать токен
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary" type="submit" disabled={pending}>
          {pending ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
