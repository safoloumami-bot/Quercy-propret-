"use client";

import { useState } from "react";

const field =
  "mt-1.5 w-full rounded-[var(--radius)] border border-current/15 bg-fond px-4 py-3 text-[16px] outline-none focus:border-accent";

/** Formulaire de contact : le message arrive dans le logiciel de l'entreprise. */
export function ContactForm({ cta }: { cta: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    }).catch(() => null);
    const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (response?.ok) setState("sent");
    else {
      setError(
        data?.error ?? "Envoi impossible pour le moment. Appelez-nous ou réessayez plus tard.",
      );
      setState("error");
    }
  }

  if (state === "sent")
    return (
      <div role="status" className="bg-fond rounded-[var(--radius)] p-8 text-lg">
        Merci, votre message est bien parti. Nous vous répondons rapidement.
      </div>
    );

  return (
    <form onSubmit={submit} className="bg-fond space-y-4 rounded-[var(--radius)] p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Nom
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={field}
          />
        </label>
        <label className="block text-sm font-medium">
          Téléphone
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={field} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className={field}
        />
      </label>
      <label className="block text-sm font-medium">
        Message
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={4000}
          rows={5}
          className={field}
        />
      </label>
      {/* Piège à robots : invisible pour les personnes. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {state === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-[var(--radius)] bg-accent px-6 py-3.5 font-medium text-white disabled:opacity-60"
      >
        {state === "sending" ? "Envoi…" : cta}
      </button>
      <p className="text-xs opacity-60">Vos coordonnées servent uniquement à vous répondre.</p>
    </form>
  );
}
