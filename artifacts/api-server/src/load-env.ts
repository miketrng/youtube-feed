import { config } from "dotenv";
import { join } from "node:path";

/** `dist/index.mjs` → package root (artifacts/api-server). */
const packageRoot = join(__dirname, "..");
config({ path: join(packageRoot, ".env") });
