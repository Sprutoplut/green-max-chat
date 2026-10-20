import { useNavigate } from "react-router-dom";
import { IconRail } from "./IconRail.jsx";

export function ChatLayout() {
  const navigate = useNavigate();
  return (
    <div className="app">
      <IconRail session={{ phone: "", avatar: "" }} onLogout={() => navigate("/login")} />
      <aside className="sidebar">
        <header className="side-head">
          <div>
            <h1>
              Чаты <span className="count">0</span>
            </h1>
            <p className="me-phone">Аккаунт MAX</p>
          </div>
        </header>
        <p className="empty-list">Чатов пока нет.</p>
      </aside>
      <section className="stage">
        <div className="pattern" aria-hidden="true" />
      </section>
    </div>
  );
}
