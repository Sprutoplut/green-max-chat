import { useState } from "react";
import { colorFor, initial } from "../format.ts";
import { IconChat, IconLogout } from "../icons.tsx";
import type { Session } from "../types.ts";

export function IconRail({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const letter = initial(session.phone || "A");
  const showPhoto = session.avatar && !avatarBroken;
  return (
    <aside className="rail">
      <div className="rail-top">
        <button className="rail-btn active" type="button" aria-current="page" title="Чаты">
          <IconChat />
        </button>
      </div>
      <div className="rail-bottom">
        <span
          className="rail-avatar"
          style={{ background: showPhoto ? "transparent" : colorFor(session.phone) }}
          title={session.phone || ""}
        >
          {showPhoto ? <img src={session.avatar} alt="" onError={() => setAvatarBroken(true)} /> : letter}
        </span>
        <button className="rail-btn logout" type="button" onClick={onLogout}>
          <IconLogout />
          Выйти
        </button>
      </div>
    </aside>
  );
}
