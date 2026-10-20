import { ApiError } from "./api.ts";
import type { GreenClient, WebhookBody } from "./types.ts";

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

let currentPoll: AbortController | null = null;

type PollHandlers = {
  onBody: (body: WebhookBody) => void;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
};

export function startPolling(client: GreenClient, { onBody, onError, onSuccess }: PollHandlers) {
  currentPoll?.abort();
  const controller = new AbortController();
  currentPoll = controller;
  const { signal } = controller;

  const loop = async () => {
    while (!signal.aborted) {
      try {
        const started = Date.now();
        const data = await client.receiveNotification(20, signal);
        if (signal.aborted) return;
        onSuccess?.();
        if (!data || data.receiptId == null) {
          const pause = 2500 - (Date.now() - started);
          if (pause > 0) await wait(pause, signal);
          continue;
        }
        try {
          if (data.body) onBody(data.body);
        } finally {
          await client.deleteNotification(data.receiptId, signal);
        }
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        if (error instanceof ApiError && error.status === 408) {
          onSuccess?.();
          continue;
        }
        onError?.(error);
        await wait(3000, signal);
      }
    }
  };

  void loop();

  return () => {
    if (currentPoll === controller) currentPoll = null;
    controller.abort();
  };
}
