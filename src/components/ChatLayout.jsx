import { useNavigate } from "react-router-dom";
import { formatPhone } from "../format.js";
import { useSession } from "../session.jsx";
import { IconRail } from "./IconRail.jsx";

export function ChatLayout() {
  const navigate = useNavigate();
  const { session, logout } = useSession();

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app">
      <IconRail session={session} onLogout={onLogout} />
      <aside className="sidebar">
        <header className="side-head">
          <div>
            <h1>
              Чаты <span className="count">0</span>
            </h1>
            <p className="me-phone">{formatPhone(session.phone) || "Аккаунт MAX"}</p>
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
