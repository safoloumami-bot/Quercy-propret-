"use client";

import { useState } from "react";

const field =
  "mt-2 w-full rounded-[var(--r-btn)] border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[16px] text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]";
const label = "block text-sm font-medium text-[var(--text)]";

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
      <div
        role="status"
        className="rounded-[var(--r-card)] bg-[var(--card)] p-10 text-[var(--text)]"
      >
        <p className="titre text-[1.8rem] leading-tight">Merci, c&apos;est bien reçu.</p>
        <p className="mt-3 text-[17px] text-[var(--muted)]">
          Votre message est bien parti. Nous vous répondons rapidement.
        </p>
      </div>
    );

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-[var(--r-card)] bg-[var(--card)] p-6 text-[var(--text)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] md:p-10"
    >
      <div>
        <p className="titre text-[1.6rem] leading-tight">Une question, un devis ?</p>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Écrivez-nous, nous revenons vers vous rapidement.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
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
        <label className={label}>
          Téléphone
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={field} />
        </label>
      </div>
      <label className={label}>
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
      <label className={label}>
        Votre besoin
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
        className="h-12 w-full rounded-[var(--r-btn)] px-6 font-medium transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {state === "sending" ? "Envoi…" : cta}
      </button>
      <p className="text-xs text-[var(--muted)]">
        Vos coordonnées servent uniquement à vous répondre.
      </p>
    </form>
  );
}
