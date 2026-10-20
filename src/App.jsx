import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ChatLayout } from "./components/ChatLayout.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginGate />} />
      <Route path="/chats" element={<ChatLayout />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function LoginGate() {
  const navigate = useNavigate();
  return (
    <main className="login">
      <div className="pattern" aria-hidden="true" />
      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          navigate("/chats");
        }}
      >
        <h1>Вход в чат</h1>
        <p className="lead">Оболочка чата. Подключение к GREEN-API добавляется отдельным шагом.</p>
        <button className="primary" type="submit">
          Открыть чаты
        </button>
      </form>
    </main>
  );
}
