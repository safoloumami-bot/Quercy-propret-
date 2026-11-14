"use client";

import { Button } from "@quercy/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { Textarea } from "@quercy/ui/components/textarea";
import { SparklesIcon } from "lucide-react";
import * as React from "react";

import { useAssistant } from "@/components/assistant/assistant-context";
import { useShell } from "@/components/shell/shell-context";

/** Consigne envoyée à l'assistant : il prépare un devis brouillon, soumis à confirmation. */
export function quickQuotePrompt(client: string, description: string): string {
  return [
    `Prépare un devis brouillon pour le client « ${client.trim()} » à partir de cette description :`,
    `« ${description.trim()} »`,
    "Retrouve le client (s'il n'existe pas, dis-le-moi plutôt que d'en créer un), reprends les prestations et les prix de notre catalogue quand elles correspondent, estime les quantités, choisis le bon taux de TVA selon notre métier et signale les hypothèses à vérifier. Propose ensuite le devis pour que je le confirme.",
  ].join("\n");
}

/**
 * « Devis express » : le chantier décrit en une phrase (ou dicté), l'assistant IA prépare le
 * devis avec le catalogue de l'entreprise. Rien n'est créé sans confirmation.
 */
export function QuickQuoteButton() {
  const { setAssistantOpen } = useShell();
  const { setPending } = useAssistant();
  const [open, setOpen] = React.useState(false);
  const [client, setClient] = React.useState("");
  const [description, setDescription] = React.useState("");
  const ready = client.trim().length >= 2 && description.trim().length >= 10;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setPending(quickQuotePrompt(client, description));
    setAssistantOpen(true);
    setOpen(false);
    setDescription("");
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <SparklesIcon /> Devis express
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Devis express</DialogTitle>
              <DialogDescription>
                Décrivez le chantier comme vous le diriez au téléphone. L&apos;assistant prépare le
                devis avec votre catalogue et vos prix ; vous le vérifiez avant qu&apos;il soit
                créé.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="qq-client">Client</Label>
              <Input
                id="qq-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex. : Cabinet Delmas"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qq-description">Le chantier</Label>
              <Textarea
                id="qq-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. : salle de bain de 6 m² à refaire, douche à l'italienne, faïence toute hauteur, appartement de plus de deux ans"
                maxLength={2000}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!ready}>
                <SparklesIcon /> Préparer le devis
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
