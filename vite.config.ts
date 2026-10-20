import type { IncomingMessage, ServerResponse } from "node:http";
import { request as httpsRequest } from "node:https";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function forwardGreenApi(req: IncomingMessage, res: ServerResponse) {
  const targetPath = req.url || "/";
  const headers: Record<string, string | string[] | undefined> = {
    ...req.headers,
    host: "api.green-api.com",
  };
  delete headers.origin;
  delete headers.referer;

  const proxyReq = httpsRequest(
    {
      protocol: "https:",
      hostname: "api.green-api.com",
      path: targetPath,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const status = proxyRes.statusCode ?? 502;
      const emptyQueue = status === 408 && targetPath.includes("/receiveNotification/");
      if (emptyQueue) {
        proxyRes.resume();
        if (!res.headersSent) {
          res.statusCode = 200;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end("null");
        }
        return;
      }

      res.statusCode = status;
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined && key.toLowerCase() !== "transfer-encoding") {
          res.setHeader(key, value);
        }
      }
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (res.headersSent || res.writableEnded) return;
    res.statusCode = 502;
    res.end();
  });
  req.on("aborted", () => proxyReq.destroy());
  req.pipe(proxyReq);
}

function greenApiProxy(): Plugin {
  return {
    name: "green-api-proxy",
    configureServer(server) {
      server.middlewares.use("/green-api", forwardGreenApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/green-api", forwardGreenApi);
    },
  };
}

export default defineConfig({
  plugins: [react(), greenApiProxy()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
  },
});
