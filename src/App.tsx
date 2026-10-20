import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import { ChatLayout } from "./components/ChatLayout.tsx";
import { ChatsState } from "./components/ChatsState.tsx";
import { ChatThread } from "./components/ChatThread.tsx";
import { LoginPage } from "./components/LoginPage.tsx";
import { NewChatModal } from "./components/NewChatModal.tsx";
import { SessionProvider, useSession } from "./session.tsx";
import type { AppLocationState } from "./types.ts";

function RootRedirect() {
  const { session } = useSession();
  return <Navigate to={session ? "/chats" : "/login"} replace />;
}

function GuestRoute() {
  const { session } = useSession();
  if (session) return <Navigate to="/chats" replace />;
  return <LoginPage />;
}

function PrivateChat() {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  return <ChatLayout />;
}

function AppRoutes() {
  const { session } = useSession();
  const location = useLocation();
  const background = (location.state as AppLocationState | null)?.background;
  const tree = (
    <>
      <Routes location={(background || location) as Location}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestRoute />} />
        <Route path="/chats" element={<PrivateChat />}>
          <Route index element={null} />
          <Route path="new" element={<NewChatModal />} />
          <Route path=":chatId" element={<ChatThread />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      {background && session && (
        <Routes>
          <Route path="/chats/new" element={<NewChatModal />} />
        </Routes>
      )}
    </>
  );

  if (!session) return tree;
  return <ChatsState key={session.idInstance}>{tree}</ChatsState>;
}

export default function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}
