import { formatPhone } from "./format.ts";
import type { Chat, ChatDraft, ChatMessage, ContactInfo, HistoryItem, IncomingText, OutgoingDraft, WebhookBody } from "./types.ts";

export function createId() {
  return crypto.randomUUID();
}

export function lastMessage(chat: Chat) {
  return chat.messages[chat.messages.length - 1] || null;
}

export function sortChats(chats: Chat[]) {
  return [...chats].sort((left, right) => {
    const leftTime = lastMessage(left)?.timestamp || 0;
    const rightTime = lastMessage(right)?.timestamp || 0;
    return rightTime - leftTime;
  });
}

export function chatPreview(chat: Chat) {
  const message = lastMessage(chat);
  if (!message) return "Нет сообщений";
  const text = message.text.replace(/\s+/g, " ").trim();
  return message.outgoing ? `Вы: ${text}` : text;
}

function rememberMessages(messages: ChatMessage[], message: ChatMessage) {
  if (message.id && messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message];
}

function historyText(item: HistoryItem) {
  const direct = String(item.textMessage || "").trim();
  const extended = String(item.extendedTextMessage?.text || "").trim();
  if (
    item.typeMessage === "textMessage" ||
    item.typeMessage === "extendedTextMessage" ||
    item.typeMessage === "quotedMessage"
  ) {
    return direct || extended;
  }
  return "";
}

export function messagesFromHistory(items: HistoryItem[] | null | undefined) {
  if (!Array.isArray(items)) return [];
  const messages: ChatMessage[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.isDeleted) continue;
    if (item.chatType && item.chatType !== "user") continue;
    const text = historyText(item);
    if (!text) continue;
    const id = item.idMessage ? String(item.idMessage) : "";
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    const timestamp = Number(item.timestamp);
    messages.push({
      id: id || `${timestamp}-${messages.length}`,
      text,
      outgoing: item.type === "outgoing",
      timestamp: timestamp ? timestamp * 1000 : Date.now(),
    });
  }
  messages.sort((left, right) => left.timestamp - right.timestamp);
  return messages;
}

function nameFromHistory(items: HistoryItem[] | null | undefined) {
  if (!Array.isArray(items)) return "";
  const incoming = items.find((item) => item.type === "incoming" && (item.senderContactName || item.senderName));
  return String(incoming?.senderContactName || incoming?.senderName || "").trim();
}

function contactName(contact: ContactInfo | null | undefined) {
  return String(contact?.contactName || contact?.name || "").trim();
}

function contactPhone(contact: ContactInfo | null | undefined) {
  const value = Number(contact?.phoneNumber);
  if (!value) return "";
  return String(value);
}

function titleIsReplaceable(chat: Chat | null) {
  if (!chat?.title || chat.title === "Чат") return true;
  const phoneTitle = formatPhone(chat.phone);
  return chat.title === chat.phone || chat.title === phoneTitle;
}

export function applyHistory(
  chats: Chat[],
  chatId: string,
  items: HistoryItem[] | null | undefined,
  contact?: ContactInfo | null,
) {
  const messages = messagesFromHistory(items);
  const name = contactName(contact) || nameFromHistory(items);
  const index = chats.findIndex((chat) => chat.chatId === chatId);
  const existing = index === -1 ? null : chats[index];
  const phone = existing?.phone || contactPhone(contact);
  const known = new Set(messages.map((message) => message.id));
  const pending = (existing?.messages || []).filter((message) => message.id && !known.has(message.id));
  const merged = [...messages, ...pending].sort((left, right) => left.timestamp - right.timestamp);
  const next: Chat = {
    chatId,
    phone,
    title: existing && !titleIsReplaceable(existing) ? existing.title : name || formatPhone(phone) || "Чат",
    unread: existing?.unread || 0,
    historyLoaded: true,
    fromApi: existing?.fromApi ?? false,
    messages: merged,
  };
  if (!existing) return [next, ...chats];
  return chats.map((chat, itemIndex) => (itemIndex === index ? { ...chat, ...next, phone: chat.phone || next.phone } : chat));
}

export function chatsFromApiJournal(items: HistoryItem[] | null | undefined) {
  if (!Array.isArray(items)) return [];
  const byId = new Map<string, Chat>();
  const sorted = [...items].sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  for (const item of sorted) {
    if (item.sendByApi !== true) continue;
    if (item.chatType && item.chatType !== "user") continue;
    const chatId = item.chatId ? String(item.chatId) : "";
    if (!chatId) continue;
    const text = historyText(item);
    const timestamp = Number(item.timestamp) ? Number(item.timestamp) * 1000 : Date.now();
    const message: ChatMessage | null = text
      ? {
          id: item.idMessage ? String(item.idMessage) : `${chatId}-${timestamp}`,
          text,
          outgoing: true,
          timestamp,
        }
      : null;
    const existing = byId.get(chatId);
    if (!existing) {
      byId.set(chatId, {
        chatId,
        phone: "",
        title: "Чат",
        unread: 0,
        fromApi: true,
        messages: message ? [message] : [],
      });
      continue;
    }
    if (message) existing.messages = [message];
  }
  return [...byId.values()];
}

export function applyApiChats(current: Chat[], remote: Chat[]) {
  const remoteIds = new Set(remote.map((chat) => chat.chatId));
  const merged = remote.map((chat) => {
    const existing = current.find((item) => item.chatId === chat.chatId);
    if (!existing) return chat;
    return {
      ...existing,
      fromApi: true,
      phone: existing.phone || chat.phone,
      title: titleIsReplaceable(existing) && chat.title !== "Чат" ? chat.title : existing.title,
      messages: existing.messages.length ? existing.messages : chat.messages,
    };
  });
  const open = current.filter((chat) => !remoteIds.has(chat.chatId) && !chat.fromApi && chat.messages.length > 0);
  return [...merged, ...open];
}

export function applyContact(chats: Chat[], chatId: string, contact: ContactInfo | null | undefined) {
  if (!contact) return chats;
  return chats.map((chat) => {
    if (chat.chatId !== chatId || !titleIsReplaceable(chat)) return chat;
    const name = contactName(contact);
    const phone = chat.phone || contactPhone(contact);
    return {
      ...chat,
      phone,
      title: name || formatPhone(phone) || chat.title,
    };
  });
}

export function ensureChat(chats: Chat[], draft: ChatDraft) {
  const existing = chats.find((chat) => chat.chatId === draft.chatId);
  if (existing) return chats;
  return [
    {
      chatId: draft.chatId,
      phone: draft.phone || "",
      title: draft.title || formatPhone(draft.phone) || "Чат",
      unread: 0,
      messages: [],
    },
    ...chats,
  ];
}

export function appendOutgoing(chats: Chat[], chatId: string, message: OutgoingDraft) {
  return chats.map((chat) => {
    if (chat.chatId !== chatId) return chat;
    return {
      ...chat,
      unread: 0,
      messages: rememberMessages(chat.messages, { ...message, outgoing: true }),
    };
  });
}

function titleFromIncoming(chat: Chat, incoming: IncomingText) {
  const phoneTitle = formatPhone(chat.phone);
  const current = chat.title || "";
  const nextName = String(incoming.title || "").trim();
  const replaceable = !current || current === "Чат" || current === chat.phone || current === phoneTitle;
  if (replaceable && nextName && nextName !== phoneTitle) return nextName;
  return current || nextName || phoneTitle || "Чат";
}

export function applyIncoming(chats: Chat[], incoming: IncomingText, activeChatId: string | null) {
  const index = chats.findIndex((chat) => chat.chatId === incoming.chatId);
  const message: ChatMessage = {
    id: incoming.id || createId(),
    text: incoming.text,
    outgoing: false,
    timestamp: incoming.timestamp,
  };

  if (index === -1) {
    if (activeChatId !== incoming.chatId) return chats;
    return [
      {
        chatId: incoming.chatId,
        phone: incoming.phone || "",
        title: incoming.title || formatPhone(incoming.phone) || "Чат",
        unread: 0,
        messages: [message],
      },
      ...chats,
    ];
  }

  const chat = chats[index];
  const messages = rememberMessages(chat.messages, message);
  if (messages === chat.messages) return chats;
  const unread = activeChatId === chat.chatId ? 0 : (chat.unread || 0) + 1;
  const next: Chat = {
    ...chat,
    phone: chat.phone || incoming.phone || "",
    title: titleFromIncoming(chat, incoming),
    unread,
    messages,
  };
  return chats.map((item, itemIndex) => (itemIndex === index ? next : item));
}

export function markRead(chats: Chat[], chatId: string) {
  const chat = chats.find((item) => item.chatId === chatId);
  if (!chat?.unread) return chats;
  return chats.map((item) => (item.chatId === chatId ? { ...item, unread: 0 } : item));
}

function textFromMessage(messageData: WebhookBody["messageData"]) {
  if (!messageData) return "";
  if (messageData.typeMessage === "textMessage") {
    return messageData.textMessageData?.textMessage || "";
  }
  if (messageData.typeMessage === "extendedTextMessage" || messageData.typeMessage === "quotedMessage") {
    return messageData.extendedTextMessageData?.text || messageData.textMessageData?.textMessage || "";
  }
  return "";
}

export function incomingText(body: WebhookBody | null | undefined): IncomingText | null {
  if (!body || body.typeWebhook !== "incomingMessageReceived") return null;
  const sender = body.senderData || {};
  if (sender.chatType && sender.chatType !== "user") return null;
  const text = String(textFromMessage(body.messageData) || "").trim();
  if (!text || !sender.chatId) return null;
  const phoneNumber = sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : "";
  const timestamp = Number(body.timestamp);
  return {
    chatId: String(sender.chatId),
    text,
    id: body.idMessage ? String(body.idMessage) : "",
    timestamp: timestamp ? timestamp * 1000 : Date.now(),
    title: sender.senderContactName || sender.senderName || sender.chatName || "",
    phone: phoneNumber === "0" ? "" : phoneNumber,
  };
}
