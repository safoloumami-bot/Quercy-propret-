import type { Metadata } from "next";

import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Double authentification" };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <TwoFactorForm next={safeNext(next)} />;
}
