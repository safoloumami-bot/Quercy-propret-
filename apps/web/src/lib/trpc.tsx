"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@quercy/ui/components/toaster";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type * as React from "react";
import { useState } from "react";
import superjson from "superjson";

import type { AppRouter } from "@/server/trpc/root";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

/** Vrai si le serveur a refusé l'action faute de droits. */
export function isForbiddenError(error: unknown): boolean {
  return (error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";
}

/** Un refus de droits ne reste jamais muet : l'utilisateur sait à qui s'adresser. */
function notifyForbidden(error: unknown) {
  toast.error("Accès réservé", {
    id: "acces-reserve",
    description: `${errorMessage(error)} Un administrateur peut vous donner l'accès (Réglages › Rôles).`,
  });
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window !== "undefined" && isForbiddenError(error)) notifyForbidden(error);
      },
    }),
    mutationCache: new MutationCache({
      // Une action sans gestion d'erreur propre affiche quand même pourquoi elle a échoué.
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        if (isForbiddenError(error)) notifyForbidden(error);
        else toast.error(errorMessage(error));
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" &&
            op.direction === "down" &&
            op.result instanceof Error,
        }),
        httpBatchLink({ url: "/api/trpc", transformer: superjson }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

/** Message d'erreur affichable à partir d'une erreur tRPC. */
export function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const zod = (
      error as {
        data?: { zodError?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
      }
    ).data?.zodError;
    const first = zod?.formErrors?.[0] ?? Object.values(zod?.fieldErrors ?? {})[0]?.[0];
    if (first) return first;
    return error.message;
  }
  return "Une erreur inattendue est survenue. Réessayez.";
}

/** Vrai si l'erreur vient d'une limite de l'offre (l'interface propose alors de changer d'offre). */
export function isPlanLimitError(error: unknown): boolean {
  return Boolean((error as { data?: { planLimit?: boolean } } | null)?.data?.planLimit);
}
