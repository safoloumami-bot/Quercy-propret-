import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createContext } from "./init";
import { createCaller } from "./root";

/** Appelant tRPC côté serveur (composants serveur), avec la session de la requête. */
export const api = cache(async () => {
  const context = await createContext({ headers: new Headers(await headers()) });
  return createCaller(context);
});
