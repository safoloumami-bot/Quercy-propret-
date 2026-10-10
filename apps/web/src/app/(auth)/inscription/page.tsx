import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeNext } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth";
import { socialProviders } from "@/server/env";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next, "/bienvenue");
  if (await getSession()) redirect(next);
  return <SignUpForm next={next} defaultEmail={params.email ?? ""} providers={socialProviders()} />;
}
