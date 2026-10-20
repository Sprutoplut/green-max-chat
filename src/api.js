const API_URL = "https://api.green-api.com";

const STATE_MESSAGES = {
  notAuthorized:
    "Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.",
  blocked: "Инстанс заблокирован.",
  starting: "Инстанс запускается. Подождите несколько минут и войдите снова.",
  suspended: "На аккаунте временное ограничение отправки сообщений.",
  pendingPassword:
    "Для входа в инстанс нужен пароль двухфакторной аутентификации в кабинете GREEN-API.",
};

function formatApiError(data, status) {
  if (typeof data === "string" && data.trim()) {
    const text = data.trim();
    if (text.startsWith("<")) return `GREEN-API вернул ошибку ${status}`;
    return text.slice(0, 300);
  }
  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message) return data.message;
    if (typeof data.reason === "string" && data.reason) return data.reason;
    if (typeof data.error === "string" && data.error) return data.error;
  }
  if (status === 401 || status === 403) return "Неверные idInstance или apiTokenInstance";
  return `GREEN-API вернул ошибку ${status}`;
}

export function createClient(idInstance, apiTokenInstance) {
  const id = encodeURIComponent(String(idInstance).trim());
  const token = encodeURIComponent(String(apiTokenInstance).trim());
  const root = `${API_URL}/waInstance${id}`;

  async function request(method, path, { body, signal } = {}) {
    let response;
    try {
      response = await fetch(`${root}/${path}`, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        cache: "no-store",
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new Error("Нет соединения с GREEN-API");
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      const error = new Error(formatApiError(data, response.status));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  return {
    getAccountSettings(signal) {
      return request("GET", `getAccountSettings/${token}`, { signal });
    },
    getSettings(signal) {
      return request("GET", `getSettings/${token}`, { signal });
    },
    setSettings(body, signal) {
      return request("POST", `setSettings/${token}`, { body, signal });
    },
    checkAccount(phoneNumber, signal) {
      return request("POST", `checkAccount/${token}`, {
        body: { phoneNumber: Number(phoneNumber) },
        signal,
      });
    },
    sendMessage(chatId, message, signal) {
      return request("POST", `sendMessage/${token}`, {
        body: { chatId, message },
        signal,
      });
    },
    receiveNotification(timeout, signal) {
      return request("GET", `receiveNotification/${token}?receiveTimeout=${timeout}`, { signal });
    },
    deleteNotification(receiptId, signal) {
      return request("DELETE", `deleteNotification/${token}/${receiptId}`, { signal });
    },
  };
}

export async function connectInstance(idInstance, apiTokenInstance) {
  const client = createClient(idInstance, apiTokenInstance);
  const account = await client.getAccountSettings();
  if (!account || account.stateInstance !== "authorized") {
    throw new Error(STATE_MESSAGES[account?.stateInstance] || "Инстанс не готов к работе");
  }

  const settings = await client.getSettings();
  let restarting = false;
  const webhook = settings?.webhookUrl || "";
  if (webhook !== "" || settings?.incomingWebhook !== "yes") {
    await client.setSettings({ webhookUrl: "", incomingWebhook: "yes" });
    restarting = true;
  }

  return {
    restarting,
    session: {
      idInstance: String(idInstance).trim(),
      apiTokenInstance: String(apiTokenInstance).trim(),
      phone: account.phone ? String(account.phone) : "",
      selfChatId: account.chatId ? String(account.chatId) : "",
      avatar: account.avatar || "",
    },
  };
}
