import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { api } from "@/server/trpc/server";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const me = await (await api()).profile.me();
  return (
    <>
      <PageHeader
        title="Profil"
        description="Vos informations personnelles, visibles par les membres de vos espaces."
      />
      <ProfileForm name={me.name} email={me.email} emailVerified={me.emailVerified} />
    </>
  );
}
