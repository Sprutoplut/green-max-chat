import { Navigate, Route, Routes } from "react-router-dom";
import { ChatLayout } from "./components/ChatLayout.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { SessionProvider, useSession } from "./session.jsx";

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

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestRoute />} />
        <Route path="/chats" element={<PrivateChat />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </SessionProvider>
  );
}
