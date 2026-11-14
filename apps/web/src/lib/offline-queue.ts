"use client";

import type { EntityKey } from "@quercy/core";

/** Création saisie hors ligne, envoyée au retour de la connexion. */
export interface QueuedCreate {
  id: string;
  workspaceId: string;
  entity: EntityKey;
  values: Record<string, unknown>;
  label: string;
  queuedAt: string;
}

const KEY = "quercy:offline-queue";
const EVENT = "quercy:offline-queue";

export function readQueue(): QueuedCreate[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedCreate[];
  } catch {
    return [];
  }
}

function write(queue: QueuedCreate[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Stockage indisponible (navigation privée) : la file reste vide.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function enqueueCreate(item: Omit<QueuedCreate, "id" | "queuedAt" | "workspaceId">) {
  const workspaceId = document.documentElement.dataset.workspace ?? "";
  write([
    ...readQueue(),
    { ...item, workspaceId, id: crypto.randomUUID(), queuedAt: new Date().toISOString() },
  ]);
}

export function removeFromQueue(id: string) {
  write(readQueue().filter((q) => q.id !== id));
}

export function clearQueue() {
  write([]);
}

export function onQueueChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Hors ligne : `navigator.onLine` faux. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
