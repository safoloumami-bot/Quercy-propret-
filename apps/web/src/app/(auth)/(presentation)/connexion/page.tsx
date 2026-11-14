import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNext } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth";
import { socialProviders } from "@/server/env";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);
  return (
    <SignInForm
      next={next}
      defaultEmail={params.email ?? ""}
      providers={socialProviders()}
      linkError={
        params.error
          ? "Ce lien de connexion n'est plus valable. Demandez-en un nouveau."
          : undefined
      }
    />
  );
}
