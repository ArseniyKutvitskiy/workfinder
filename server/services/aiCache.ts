import { createHash } from "node:crypto";
// Process-local, bounded, short-lived cache. Identity is part of every key.
export class AiCache {
  private entries = new Map<string, { expires: number; value: unknown }>();
  private pending = new Map<string, Promise<unknown>>();
  constructor(
    private readonly ttl = 600000,
    private readonly capacity = 100,
  ) {}
  key(userId: string, model: string, kind: string, input: unknown) {
    return createHash("sha256")
      .update(JSON.stringify(["v2", userId, model, kind, input]))
      .digest("hex");
  }
  async getOrCreate<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    for (const [id, entry] of this.entries)
      if (entry.expires <= now) this.entries.delete(id);
    const hit = this.entries.get(key);
    if (hit) return hit.value as T;
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const promise = loader().then((value) => {
      while (this.entries.size >= this.capacity) {
        const oldest = this.entries.keys().next().value;
        if (oldest) this.entries.delete(oldest);
        else break;
      }
      this.entries.set(key, { value, expires: Date.now() + this.ttl });
      return value;
    });
    this.pending.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }
}
