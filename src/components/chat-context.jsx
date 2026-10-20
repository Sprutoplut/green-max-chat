import { createContext, useContext } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ value, children }) {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChats() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("Список чатов не подключен");
  return value;
}
