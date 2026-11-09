// Vercel entry: the whole Express API runs as one Vercel Function.
// `pnpm build` compiles server/ and shared/ into build-server/ before functions are bundled.
// The static frontend (dist/) is served by Vercel's CDN; see vercel.json.
import { createApp } from "../build-server/server/app.js";
import { readConfig } from "../build-server/server/config.js";

export default createApp(readConfig());
