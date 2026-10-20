export type Session = {
  idInstance: string;
  apiTokenInstance: string;
  phone: string;
  selfChatId: string;
  avatar: string;
};

export type AppLocationState = {
  background?: {
    pathname: string;
    search: string;
    hash: string;
  };
  restarting?: boolean;
};

export type ChatMessage = {
  id: string;
  text: string;
  outgoing: boolean;
  timestamp: number;
};

export type Chat = {
  chatId: string;
  phone: string;
  title: string;
  unread: number;
  fromApi?: boolean;
  historyLoaded?: boolean;
  messages: ChatMessage[];
};

export type ChatDraft = {
  chatId: string;
  phone?: string;
  title?: string;
};

export type OutgoingDraft = {
  id: string;
  text: string;
  timestamp: number;
};

export type IncomingText = {
  chatId: string;
  text: string;
  id: string;
  timestamp: number;
  title: string;
  phone: string;
};

export type AccountSettings = {
  stateInstance?: string;
  phone?: string | number;
  chatId?: string | number;
  avatar?: string;
};

export type InstanceSettings = {
  webhookUrl?: string;
  incomingWebhook?: string;
};

export type WebhookSettings = {
  webhookUrl: string;
  incomingWebhook: "yes" | "no";
};

export type CheckAccountResult = {
  status?: boolean;
  reason?: string;
  exist?: boolean;
  chatId?: string | number;
};

export type ContactInfo = {
  name?: string;
  contactName?: string;
  chatId?: string | number;
  chatType?: string;
  phoneNumber?: number;
};

export type SendMessageResult = {
  idMessage?: string;
};

export type HistoryItem = {
  type?: string;
  idMessage?: string | number;
  timestamp?: number;
  typeMessage?: string;
  chatType?: string;
  textMessage?: string;
  sendByApi?: boolean;
  chatId?: string | number;
  extendedTextMessage?: { text?: string };
  senderName?: string;
  senderContactName?: string;
  isDeleted?: boolean;
};

export type WebhookBody = {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string | number;
  senderData?: {
    chatId?: string | number;
    chatType?: string;
    senderPhoneNumber?: string | number;
    senderContactName?: string;
    senderName?: string;
    chatName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
};

export type NotificationData = {
  receiptId?: number | string | null;
  body?: WebhookBody | null;
};

export type GreenClient = {
  getAccountSettings(signal?: AbortSignal): Promise<AccountSettings | null>;
  getSettings(signal?: AbortSignal): Promise<InstanceSettings | null>;
  setSettings(body: WebhookSettings, signal?: AbortSignal): Promise<unknown>;
  checkAccount(phoneNumber: string, signal?: AbortSignal): Promise<CheckAccountResult | null>;
  getContactInfo(chatId: string, signal?: AbortSignal): Promise<ContactInfo | null>;
  getLastOutgoingMessages(minutes?: number, signal?: AbortSignal): Promise<HistoryItem[] | null>;
  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<SendMessageResult | null>;
  getChatHistory(chatId: string, count?: number, signal?: AbortSignal): Promise<HistoryItem[] | null>;
  receiveNotification(timeout: number, signal?: AbortSignal): Promise<NotificationData | null>;
  deleteNotification(receiptId: number | string, signal?: AbortSignal): Promise<unknown>;
};

export type ChatStore = {
  chats: Chat[];
  chatsLoading: boolean;
  reloadChats: () => void;
  update: (updater: (current: Chat[]) => Chat[]) => void;
  pollError: boolean;
  showRestart: boolean;
  dismissRestart: () => void;
};
