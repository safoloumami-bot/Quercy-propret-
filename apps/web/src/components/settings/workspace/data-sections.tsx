"use client";

import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { SettingsSection } from "../section";

export function ExportSection() {
  return (
    <SettingsSection
      id="export"
      title="Exporter les données"
      description="Archive ZIP de toutes les données de l'espace : un fichier JSON complet et un CSV par table, lisibles dans Excel. L'export est tracé dans le journal d'audit."
      footer={
        <Button variant="secondary" asChild>
          <a href="/api/espace/export" download>
            <DownloadIcon />
            Télécharger l&apos;export
          </a>
        </Button>
      }
    />
  );
}

export function LeaveSection({ organizationName }: { organizationName: string }) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const leave = useMutation(
    trpc.workspace.leave.mutationOptions({
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  return (
    <>
      <SettingsSection
        id="leave"
        danger
        title="Quitter l'espace"
        description="Vous perdrez l'accès à cet espace. Un administrateur pourra vous réinviter."
        footer={
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Quitter l&apos;espace
          </Button>
        }
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Quitter ${organizationName} ?`}
        description="Vos contributions restent dans l'espace ; seul votre accès est retiré."
        confirmLabel="Quitter l'espace"
        destructive
        pending={leave.isPending}
        onConfirm={() => leave.mutate()}
      />
    </>
  );
}
