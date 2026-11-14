"use client";

import { formatCents } from "@quercy/core";
import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileInputIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { errorMessage, useTRPC } from "@/lib/trpc";

const MAX_BYTES = 10 * 1024 * 1024;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Dépose une facture fournisseur électronique (PDF Factur-X ou XML CII/UBL) : montants,
 * dates et fournisseur sont lus dans le fichier, sans ressaisie.
 */
export function ImportEInvoiceButton() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const input = React.useRef<HTMLInputElement>(null);
  const importFile = useMutation(
    trpc.sales.importEInvoice.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          `Facture ${r.number} de ${r.supplier} enregistrée (${formatCents(r.totalCents)})${
            r.supplierCreated ? ", fournisseur créé" : ""
          }.`,
        );
        void queryClient.invalidateQueries(trpc.records.pathFilter());
        router.push(r.path);
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop lourd (10 Mo au plus).");
      return;
    }
    importFile.mutate({ filename: file.name, contentBase64: toBase64(await file.arrayBuffer()) });
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => input.current?.click()}
        disabled={importFile.isPending}
      >
        <FileInputIcon /> {importFile.isPending ? "Lecture…" : "Déposer une facture électronique"}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".pdf,.xml,application/pdf,application/xml,text/xml"
        className="sr-only"
        aria-label="Facture électronique (PDF Factur-X ou XML)"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
