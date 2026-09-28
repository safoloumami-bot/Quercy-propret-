import { afterEach, describe, expect, it } from "vitest";

import { requestOrigin, trustedOrigins } from "../auth";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("origines de confiance", () => {
  it("ajoute les adresses de Netlify et TRUSTED_ORIGINS, normalisées", () => {
    process.env.URL = "https://mon-site-exemple.netlify.app";
    process.env.DEPLOY_PRIME_URL =
      "https://claude-saas-modulaire-prompt-bgo7mm--mon-site-exemple.netlify.app";
    process.env.TRUSTED_ORIGINS = "https://app.exemple.fr/, pas une adresse";
    expect(trustedOrigins(["https://mon-site-exemple.netlify.app/"])).toEqual([
      "https://mon-site-exemple.netlify.app",
      "https://claude-saas-modulaire-prompt-bgo7mm--mon-site-exemple.netlify.app",
      "https://app.exemple.fr",
    ]);
  });

  it("reconnaît l'origine de la requête, y compris derrière le proxy de l'hébergeur", () => {
    const direct = new Request("https://mon-site-exemple.netlify.app/api/auth/sign-up/email");
    expect(requestOrigin(direct)).toBe("https://mon-site-exemple.netlify.app");
    const proxied = new Request("http://127.0.0.1:3000/api/auth/sign-up/email", {
      headers: { "x-forwarded-host": "app.exemple.fr", "x-forwarded-proto": "https" },
    });
    expect(requestOrigin(proxied)).toBe("https://app.exemple.fr");
  });
});
