import { createContext, useContext, type ReactNode } from "react";
import type { ChatStore } from "../types.ts";

const ChatContext = createContext<ChatStore | null>(null);

export function ChatProvider({ value, children }: { value: ChatStore; children: ReactNode }) {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChats() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("Список чатов не подключен");
  return value;
}
