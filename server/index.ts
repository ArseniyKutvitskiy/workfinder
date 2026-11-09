import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app.ts";
import { readConfig } from "./config.ts";
const root = process.cwd();
let config;
try {
  config = readConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Startup failed");
  process.exit(1);
}
if (!config.OPENAI_API_KEY)
  console.warn(
    "OPENAI_API_KEY is not set: AI features run in offline fallback mode.",
  );
process.on("unhandledRejection", (reason) => {
  console.error(
    JSON.stringify({
      event: "unhandledRejection",
      error: reason instanceof Error ? reason.name : typeof reason,
    }),
  );
});
process.on("uncaughtException", (error) => {
  console.error(JSON.stringify({ event: "uncaughtException", error: error.name }));
  // State may be corrupt; exit and let the platform restart the instance.
  process.exit(1);
});
const app = createApp(config);
if (process.argv.includes("--production")) {
  const html = readFileSync(path.join(root, "dist/index.html"), "utf8").replace(
    "</head>",
    '<link rel="canonical" href="' +
      config.APP_ORIGIN +
      '/"><meta property="og:url" content="' +
      config.APP_ORIGIN +
      '/"></head>',
  );
  app.get("/", (_req, res) => res.type("html").send(html));
  app.use(
    "/assets",
    express.static(path.join(root, "dist/assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(express.static(path.join(root, "dist"), { maxAge: 0 }));
  app.get("/{*path}", (_req, res) =>
    res.set("X-Robots-Tag", "noindex").type("html").send(html),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(
  config.PORT,
  config.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
);
server.once("listening", () =>
  console.log(`WorkFinder listening on port ${config.PORT}`),
);
server.on("error", (error) => {
  console.error(
    `Server could not start: ${"code" in error ? error.code : "UNKNOWN"}`,
  );
  process.exit(1);
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
