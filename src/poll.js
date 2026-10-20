function wait(ms, signal) {
  return new Promise((resolve) => {
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

let currentPoll = null;

export function startPolling(client, { onBody, onError, onSuccess }) {
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
        if (data?.receiptId == null) {
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
        if (signal.aborted || error?.name === "AbortError") return;
        onError?.(error);
        await wait(3000, signal);
      }
    }
  };

  loop();

  return () => {
    if (currentPoll === controller) currentPoll = null;
    controller.abort();
  };
}
