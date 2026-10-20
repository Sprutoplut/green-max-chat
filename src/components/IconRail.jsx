import { useState } from "react";
import { IconChat, IconEye, IconGear, IconPeople, IconPhone } from "../icons.jsx";
import { colorFor, initial } from "../format.js";

export function IconRail({ session, onLogout }) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const letter = initial(session.phone || "A");
  const showPhoto = session.avatar && !avatarBroken;
  return (
    <aside className="rail">
      <div className="rail-top">
        <button className="rail-btn active" type="button" aria-current="page" title="Чаты">
          <IconChat />
        </button>
        <span className="rail-btn muted" aria-hidden="true">
          <IconEye />
        </span>
        <span className="rail-btn muted" aria-hidden="true">
          <IconPeople />
        </span>
        <span className="rail-btn muted" aria-hidden="true">
          <IconPhone />
        </span>
      </div>
      <div className="rail-bottom">
        <span
          className="rail-avatar"
          style={{ background: showPhoto ? "transparent" : colorFor(session.phone) }}
          title={session.phone || ""}
        >
          {showPhoto ? <img src={session.avatar} alt="" onError={() => setAvatarBroken(true)} /> : letter}
        </span>
        <button className="rail-btn" type="button" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <IconGear />
        </button>
      </div>
    </aside>
  );
}
