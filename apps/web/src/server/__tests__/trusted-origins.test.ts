import { afterEach, describe, expect, it } from "vitest";

import { trustedOrigins } from "../auth";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("origines de confiance", () => {
  it("ajoute les adresses de Netlify et TRUSTED_ORIGINS, normalisées", () => {
    process.env.URL = "https://radiant-vacherin-c49bd4.netlify.app";
    process.env.DEPLOY_PRIME_URL =
      "https://claude-saas-modulaire-prompt-bgo7mm--radiant-vacherin-c49bd4.netlify.app";
    process.env.TRUSTED_ORIGINS = "https://app.exemple.fr/, pas une adresse";
    expect(trustedOrigins(["https://radiant-vacherin-c49bd4.netlify.app/"])).toEqual([
      "https://radiant-vacherin-c49bd4.netlify.app",
      "https://claude-saas-modulaire-prompt-bgo7mm--radiant-vacherin-c49bd4.netlify.app",
      "https://app.exemple.fr",
    ]);
  });
});
