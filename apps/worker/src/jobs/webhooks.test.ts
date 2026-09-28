import { createServer } from "node:http";
import { createCipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

import { prisma } from "@quercy/db";
import { afterAll, describe, expect, it } from "vitest";

import { deliverWebhook, signPayload } from "./webhooks";

function seal(plain: string) {
  const key = Buffer.from(
    hkdfSync("sha256", process.env.BETTER_AUTH_SECRET!, "quercy", "quercy:secrets:v1", 32),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

const orgs: string[] = [];
afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
  await prisma.$disconnect();
});

describe("webhooks sortants", () => {
  it("livre un évènement signé, puis enregistre un échec pour une réponse en erreur", async () => {
    process.env.BETTER_AUTH_SECRET ??= "secret-de-test-suffisamment-long-pour-hkdf";
    delete process.env.ENCRYPTION_KEY;
    const received: { signature: string; body: string }[] = [];
    let fail = false;
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        received.push({ signature: String(req.headers["x-quercy-signature"]), body });
        res.writeHead(fail ? 500 : 204).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;

    const org = await prisma.organization.create({
      data: { name: "Webhooks", slug: `webhooks-${randomBytes(4).toString("hex")}` },
    });
    orgs.push(org.id);
    const hook = await prisma.webhook.create({
      data: {
        organizationId: org.id,
        url: `http://127.0.0.1:${port}/hook`,
        secret: seal("whsec_test"),
        events: ["company.created"],
      },
    });
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        event: "company.created",
        payload: { event: "company.created", data: { id: "c1" } },
      },
    });
    await expect(deliverWebhook(delivery.id)).resolves.toEqual({ status: 204 });
    const [first] = received;
    const t = Number(/t=(\d+)/.exec(first!.signature)![1]);
    expect(first!.signature).toBe(signPayload("whsec_test", first!.body, t));
    expect(createHmac("sha256", "whsec_test").update(`${t}.${first!.body}`).digest("hex")).toBe(
      first!.signature.split("v1=")[1],
    );
    expect(
      (await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status,
    ).toBe("delivered");

    fail = true;
    const second = await prisma.webhookDelivery.create({
      data: { webhookId: hook.id, event: "company.created", payload: {} },
    });
    await expect(deliverWebhook(second.id)).rejects.toThrow("Réponse 500");
    expect(
      await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: second.id } }),
    ).toMatchObject({
      status: "failed",
      statusCode: 500,
      attempts: 1,
    });
    server.close();
  });
});
