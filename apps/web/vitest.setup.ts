import { config } from "dotenv";
import { vi } from "vitest";

config({ path: new URL("../../.env", import.meta.url).pathname, quiet: true });

// `server-only` refuse d'être importé hors de Next.js ; les tests serveur l'importent volontairement.
vi.mock("server-only", () => ({}));
