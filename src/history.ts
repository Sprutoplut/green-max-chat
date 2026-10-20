import { ApiError } from "./api.ts";
import type { ContactInfo, GreenClient, HistoryItem } from "./types.ts";

const GAP_MS = 1100;
const CACHE_MS = 8000;

const cache = new Map<string, { at: number; items: HistoryItem[] }>();
const inflight = new Map<string, Promise<HistoryItem[]>>();
let queue: Promise<void> = Promise.resolve();
let nextSlot = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function schedule<T>(task: () => Promise<T>) {
  const run = queue.then(async () => {
    const wait = Math.max(0, nextSlot - Date.now());
    if (wait) await sleep(wait);
    nextSlot = Date.now() + GAP_MS;
    return task();
  });
  queue = run.then(
    () => {},
    () => {},
  );
  return run;
}

export function loadChatHistory(client: GreenClient, chatId: string, count = 100) {
  const key = String(chatId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return Promise.resolve(cached.items);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = schedule(async () => {
    let delay = GAP_MS;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const items = await client.getChatHistory(key, count);
        const list = Array.isArray(items) ? items : [];
        cache.set(key, { at: Date.now(), items: list });
        return list;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 429 || attempt === 3) throw error;
        await sleep(delay);
        delay += GAP_MS;
      }
    }
    return [];
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}

const contactCache = new Map<string, { at: number; info: ContactInfo | null }>();
const contactInflight = new Map<string, Promise<ContactInfo | null>>();

export function loadContactInfo(client: GreenClient, chatId: string) {
  const key = String(chatId);
  const cached = contactCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.info);

  const pending = contactInflight.get(key);
  if (pending) return pending;

  const request = client
    .getContactInfo(key)
    .then((info) => {
      contactCache.set(key, { at: Date.now(), info });
      return info;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 429) return null;
      throw error;
    })
    .finally(() => {
      contactInflight.delete(key);
    });

  contactInflight.set(key, request);
  return request;
}

const JOURNAL_MINUTES = 60 * 24 * 90;
let outgoingInflight: Promise<HistoryItem[]> | null = null;

export function loadApiChats(client: GreenClient) {
  if (outgoingInflight) return outgoingInflight;

  const request = (async () => {
    let delay = GAP_MS;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const items = await client.getLastOutgoingMessages(JOURNAL_MINUTES);
        return Array.isArray(items) ? items : [];
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 429 || attempt === 2) throw error;
        await sleep(delay);
        delay += GAP_MS;
      }
    }
    return [];
  })().finally(() => {
    outgoingInflight = null;
  });

  outgoingInflight = request;
  return request;
}
