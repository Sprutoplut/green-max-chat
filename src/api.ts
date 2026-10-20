import type {
  AccountSettings,
  CheckAccountResult,
  ContactInfo,
  GreenClient,
  HistoryItem,
  InstanceSettings,
  NotificationData,
  SendMessageResult,
  Session,
  WebhookSettings,
} from "./types.ts";

const API_URL = "/green-api";

const STATE_MESSAGES: Record<string, string> = {
  notAuthorized:
    "Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.",
  blocked: "Инстанс заблокирован.",
  starting: "Инстанс запускается. Подождите несколько минут и войдите снова.",
  suspended: "На аккаунте временное ограничение отправки сообщений.",
  pendingPassword:
    "Для входа в инстанс нужен пароль двухфакторной аутентификации в кабинете GREEN-API.",
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatApiError(data: unknown, status: number) {
  if (typeof data === "string" && data.trim()) {
    const text = data.trim();
    if (text.startsWith("<")) return `GREEN-API вернул ошибку ${status}`;
    return text.slice(0, 300);
  }
  if (data && typeof data === "object") {
    const record = data as { message?: unknown; reason?: unknown; error?: unknown };
    if (typeof record.message === "string" && record.message) return record.message;
    if (typeof record.reason === "string" && record.reason) return record.reason;
    if (typeof record.error === "string" && record.error) return record.error;
  }
  if (status === 401 || status === 403) return "Неверные idInstance или apiTokenInstance";
  if (status === 429) return "Журнал GREEN-API временно ограничил частоту запросов. Подождите секунду.";
  return `GREEN-API вернул ошибку ${status}`;
}

export function createClient(idInstance: string, apiTokenInstance: string): GreenClient {
  const id = encodeURIComponent(String(idInstance).trim());
  const token = encodeURIComponent(String(apiTokenInstance).trim());
  const root = `${API_URL}/waInstance${id}`;

  async function request<T>(method: string, path: string, options: { body?: unknown; signal?: AbortSignal } = {}) {
    let response: Response;
    try {
      response = await fetch(`${root}/${path}`, {
        method,
        headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new Error("Нет соединения с GREEN-API");
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      throw new ApiError(formatApiError(data, response.status), response.status);
    }
    return data as T;
  }

  return {
    getAccountSettings(signal) {
      return request<AccountSettings | null>("GET", `getAccountSettings/${token}`, { signal });
    },
    getSettings(signal) {
      return request<InstanceSettings | null>("GET", `getSettings/${token}`, { signal });
    },
    setSettings(body: WebhookSettings, signal) {
      return request("POST", `setSettings/${token}`, { body, signal });
    },
    checkAccount(phoneNumber, signal) {
      return request<CheckAccountResult | null>("POST", `checkAccount/${token}`, {
        body: { phoneNumber: Number(phoneNumber) },
        signal,
      });
    },
    getContactInfo(chatId, signal) {
      return request<ContactInfo | null>("POST", `getContactInfo/${token}`, {
        body: { chatId },
        signal,
      });
    },
    getLastOutgoingMessages(minutes, signal) {
      const query = minutes ? `?minutes=${minutes}` : "";
      return request<HistoryItem[] | null>("GET", `lastOutgoingMessages/${token}${query}`, { signal });
    },
    sendMessage(chatId, message, signal) {
      return request<SendMessageResult | null>("POST", `sendMessage/${token}`, {
        body: { chatId, message },
        signal,
      });
    },
    getChatHistory(chatId, count = 100, signal) {
      return request<HistoryItem[] | null>("POST", `getChatHistory/${token}`, {
        body: { chatId, count },
        signal,
      });
    },
    receiveNotification(timeout, signal) {
      return request<NotificationData | null>("GET", `receiveNotification/${token}?receiveTimeout=${timeout}`, {
        signal,
      });
    },
    deleteNotification(receiptId, signal) {
      return request("DELETE", `deleteNotification/${token}/${receiptId}`, { signal });
    },
  };
}

export async function connectInstance(idInstance: string, apiTokenInstance: string) {
  const client = createClient(idInstance, apiTokenInstance);
  const account = await client.getAccountSettings();
  if (!account || account.stateInstance !== "authorized") {
    const state = account?.stateInstance;
    throw new Error((state && STATE_MESSAGES[state]) || "Инстанс не готов к работе");
  }

  const settings = await client.getSettings();
  let restarting = false;
  const webhook = settings?.webhookUrl || "";
  if (webhook !== "" || settings?.incomingWebhook !== "yes") {
    await client.setSettings({ webhookUrl: "", incomingWebhook: "yes" });
    restarting = true;
  }

  const session: Session = {
    idInstance: String(idInstance).trim(),
    apiTokenInstance: String(apiTokenInstance).trim(),
    phone: account.phone ? String(account.phone) : "",
    selfChatId: account.chatId ? String(account.chatId) : "",
    avatar: account.avatar || "",
  };

  return { restarting, session };
}
