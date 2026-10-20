import { formatPhone } from "./format.js";

const MESSAGE_LIMIT = 200;

export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function lastMessage(chat) {
  return chat.messages[chat.messages.length - 1] || null;
}

export function sortChats(chats) {
  return [...chats].sort((left, right) => {
    const leftTime = lastMessage(left)?.timestamp || 0;
    const rightTime = lastMessage(right)?.timestamp || 0;
    return rightTime - leftTime;
  });
}

export function chatPreview(chat) {
  const message = lastMessage(chat);
  if (!message) return "Нет сообщений";
  const text = message.text.replace(/\s+/g, " ").trim();
  return message.outgoing ? `Вы: ${text}` : text;
}

function rememberMessages(messages, message) {
  if (message.id && messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message].slice(-MESSAGE_LIMIT);
}

export function ensureChat(chats, draft) {
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

export function appendOutgoing(chats, chatId, message) {
  return chats.map((chat) => {
    if (chat.chatId !== chatId) return chat;
    return {
      ...chat,
      unread: 0,
      messages: rememberMessages(chat.messages, { ...message, outgoing: true }),
    };
  });
}

function titleFromIncoming(chat, incoming) {
  const phoneTitle = formatPhone(chat.phone);
  const current = chat.title || "";
  const nextName = String(incoming.title || "").trim();
  const currentIsPhone = !current || current === chat.phone || current === phoneTitle;
  if (currentIsPhone && nextName && nextName !== phoneTitle) return nextName;
  return current || nextName || phoneTitle || "Чат";
}

export function applyIncoming(chats, incoming, activeChatId) {
  const index = chats.findIndex((chat) => chat.chatId === incoming.chatId);
  const message = {
    id: incoming.id || createId(),
    text: incoming.text,
    outgoing: false,
    timestamp: incoming.timestamp,
  };

  if (index === -1) {
    return [
      {
        chatId: incoming.chatId,
        phone: incoming.phone || "",
        title: incoming.title || formatPhone(incoming.phone) || "Чат",
        unread: activeChatId === incoming.chatId ? 0 : 1,
        messages: [message],
      },
      ...chats,
    ];
  }

  const chat = chats[index];
  const messages = rememberMessages(chat.messages, message);
  if (messages === chat.messages) return chats;
  const unread = activeChatId === chat.chatId ? 0 : (chat.unread || 0) + 1;
  const next = {
    ...chat,
    phone: chat.phone || incoming.phone || "",
    title: titleFromIncoming(chat, incoming),
    unread,
    messages,
  };
  return chats.map((item, itemIndex) => (itemIndex === index ? next : item));
}

export function markRead(chats, chatId) {
  const chat = chats.find((item) => item.chatId === chatId);
  if (!chat?.unread) return chats;
  return chats.map((item) => (item.chatId === chatId ? { ...item, unread: 0 } : item));
}

function textFromMessage(messageData) {
  if (!messageData) return "";
  if (messageData.typeMessage === "textMessage") {
    return messageData.textMessageData?.textMessage || "";
  }
  if (messageData.typeMessage === "extendedTextMessage" || messageData.typeMessage === "quotedMessage") {
    return messageData.extendedTextMessageData?.text || messageData.textMessageData?.textMessage || "";
  }
  return "";
}

export function incomingText(body) {
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
