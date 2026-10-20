import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ChatLayout } from "./components/ChatLayout.jsx";
import { ChatsState } from "./components/ChatsState.jsx";
import { ChatThread } from "./components/ChatThread.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { NewChatModal } from "./components/NewChatModal.jsx";
import { useSession, SessionProvider } from "./session.jsx";

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
  const background = location.state?.background;
  const tree = (
    <>
      <Routes location={background || location}>
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
