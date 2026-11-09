import type { Response } from "express";
import { HttpError } from "./errors.ts";
export async function streamResponse(
  res: Response,
  run: (
    emit: (event: string, payload: unknown) => void,
    signal: AbortSignal,
  ) => Promise<void>,
) {
  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", abort);
  const deadline = setTimeout(() => controller.abort(), 110000);
  res
    .status(200)
    .set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })
    .flushHeaders();
  const emit = (event: string, payload: unknown) => {
    if (!controller.signal.aborted && !res.writableEnded)
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  const heartbeat = setInterval(() => {
    if (!controller.signal.aborted) res.write(": heartbeat\n\n");
  }, 15000);
  try {
    await run(emit, controller.signal);
  } catch (error) {
    if (!controller.signal.aborted)
      emit("error", {
        errorKey: error instanceof HttpError ? error.code : "ai.failed",
      });
  } finally {
    clearTimeout(deadline);
    clearInterval(heartbeat);
    res.off("close", abort);
    res.end();
  }
}
