import { afterAll, describe, expect, it, vi } from "vitest";

import { MailNotConfiguredError, closeMailer, mailConfigured, sendMail } from "./index";

afterAll(closeMailer);

describe("sendMail", () => {
  it("journalise l'email et ses pièces jointes sans fournisseur configuré", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.ENABLE_DEV_MAILBOX = "false";
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendMail({
      to: "client@example.fr",
      subject: "Votre facture",
      html: '<p>Bonjour <a href="https://quercy.test/f/abc?x=1&amp;y=2">voir</a></p>',
      text: "Bonjour",
      attachments: [{ filename: "FA-2026-0001.pdf", content: new Uint8Array([1, 2]) }],
    });
    const entry = JSON.parse(String(log.mock.calls[0]![0])) as {
      links: string[];
      attachments: string[];
    };
    expect(entry.links).toEqual(["https://quercy.test/f/abc?x=1&y=2"]);
    expect(entry.attachments).toEqual(["FA-2026-0001.pdf"]);
    log.mockRestore();
  });

  it("en production sans fournisseur, signale clairement que rien n'est parti", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.ENABLE_DEV_MAILBOX = "false";
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(mailConfigured()).toBe(false);
    await expect(
      sendMail({ to: "client@example.fr", subject: "Test", html: "<p>x</p>", text: "x" }),
    ).rejects.toBeInstanceOf(MailNotConfiguredError);
    process.env.RESEND_API_KEY = "re_test";
    expect(mailConfigured()).toBe(true);
    delete process.env.RESEND_API_KEY;
    vi.unstubAllEnvs();
    log.mockRestore();
  });
});
