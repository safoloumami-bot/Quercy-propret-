"use client";

import { Avatar, AvatarFallback } from "@quercy/ui/components/avatar";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { Checkbox } from "@quercy/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@quercy/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { EmptyState } from "@quercy/ui/components/empty-state";
import { Input } from "@quercy/ui/components/input";
import { Kbd } from "@quercy/ui/components/kbd";
import { Label } from "@quercy/ui/components/label";
import { Separator } from "@quercy/ui/components/separator";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Switch } from "@quercy/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@quercy/ui/components/tooltip";
import {
  CHART_TOKENS,
  COLOR_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  TYPE_SCALE,
} from "@quercy/ui/tokens";
import {
  CopyIcon,
  InboxIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";

const SECTIONS = [
  { id: "couleurs", label: "Couleurs" },
  { id: "typographie", label: "Typographie" },
  { id: "formes", label: "Rayons et ombres" },
  { id: "boutons", label: "Boutons" },
  { id: "formulaires", label: "Formulaires" },
  { id: "badges", label: "Badges" },
  { id: "cartes", label: "Cartes" },
  { id: "navigation", label: "Onglets et menus" },
  { id: "retours", label: "Retours et superpositions" },
  { id: "etats", label: "Chargement et états vides" },
] as const;

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-4">
      <div>
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-5">{children}</div>
      <p className="border-t border-border px-5 py-2 font-mono text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function Showcase() {
  const [notifications, setNotifications] = React.useState(true);
  const [terms, setTerms] = React.useState(false);

  function demoDelete() {
    toast("Élément supprimé", {
      description: "Il reste 30 jours dans la corbeille.",
      action: { label: "Annuler", onClick: () => toast.success("Suppression annulée.") },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] gap-12 px-8 py-8">
      <div className="min-w-0 flex-1 space-y-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Les jetons et composants de <code className="font-mono text-xs">@quercy/ui</code>. Tous
            les écrans les utilisent ; aucune couleur n&apos;est écrite en dur. Basculez le thème
            pour vérifier chaque élément en clair et en sombre.
          </p>
        </header>

        <Section
          id="couleurs"
          title="Couleurs"
          description="Jetons sémantiques. L'accent (« primary ») suit la couleur choisie par l'espace."
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-6">
            {COLOR_TOKENS.map((token) => (
              <div key={token.name} className="overflow-hidden rounded-lg border border-border">
                <div
                  className="flex h-16 items-end p-2 text-xs font-medium"
                  style={{ background: `var(--${token.name})`, color: `var(--${token.fg})` }}
                >
                  Aa
                </div>
                <div className="bg-card px-2.5 py-2">
                  <p className="text-xs font-medium">{token.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{token.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {CHART_TOKENS.map((token) => (
              <div key={token} className="flex-1 space-y-1">
                <div className="h-8 rounded-md" style={{ background: `var(--${token})` }} />
                <p className="font-mono text-[11px] text-muted-foreground">{token}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="typographie"
          title="Typographie"
          description="Geist Sans pour l'interface, Geist Mono pour les codes et les montants alignés."
        >
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {TYPE_SCALE.map((type) => (
              <div key={type.label} className="flex items-baseline gap-6 px-5 py-3">
                <p className={`flex-1 ${type.className}`}>Facture FA-2026-0142 envoyée à Dupont</p>
                <p className="w-60 shrink-0 text-xs text-muted-foreground">{type.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="formes"
          title="Rayons et ombres"
          description="Des coins modérés et des ombres discrètes, plus marquées pour les éléments flottants."
        >
          <div className="grid grid-cols-2 gap-6">
            <div className="flex gap-4">
              {RADIUS_TOKENS.map((r) => (
                <div key={r.name} className="flex-1 space-y-1.5 text-center">
                  <div className={`h-16 border border-border bg-muted ${r.className}`} />
                  <p className="font-mono text-[11px] text-muted-foreground">{r.className}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              {SHADOW_TOKENS.map((s) => (
                <div key={s.name} className="flex-1 space-y-1.5 text-center">
                  <div className={`h-16 rounded-lg border border-border bg-card ${s.className}`} />
                  <p className="font-mono text-[11px] text-muted-foreground">{s.className}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="boutons"
          title="Boutons"
          description="Un seul bouton principal par zone. Les actions destructives demandent confirmation."
        >
          <Specimen label="variant : primary · secondary · subtle · ghost · destructive · link">
            <Button>
              <PlusIcon />
              Nouveau devis
            </Button>
            <Button variant="secondary">Exporter</Button>
            <Button variant="subtle">Filtrer</Button>
            <Button variant="ghost">Annuler</Button>
            <Button variant="destructive">
              <Trash2Icon />
              Supprimer
            </Button>
            <Button variant="link">Voir l&apos;historique</Button>
          </Specimen>
          <Specimen label="size : sm · md · lg · icon · icon-sm — état désactivé">
            <Button size="sm">Petit</Button>
            <Button size="md">Moyen</Button>
            <Button size="lg">Grand</Button>
            <Button size="icon" variant="secondary" aria-label="Modifier">
              <PencilIcon />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Copier">
              <CopyIcon />
            </Button>
            <Button disabled>Désactivé</Button>
          </Specimen>
        </Section>

        <Section
          id="formulaires"
          title="Formulaires"
          description="Libellé au-dessus du champ, message d'aide ou d'erreur en dessous."
        >
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="ds-name">Raison sociale</Label>
              <Input id="ds-name" placeholder="Dupont & Fils SARL" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-email">Email de facturation</Label>
              <Input
                id="ds-email"
                defaultValue="compta@dupont"
                aria-invalid
                aria-describedby="ds-email-error"
              />
              <p id="ds-email-error" className="text-xs text-destructive">
                Adresse incomplète : il manque le domaine (ex. dupont.fr).
              </p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ds-notes">Notes internes</Label>
              <Textarea id="ds-notes" placeholder="Visibles uniquement par votre équipe" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ds-terms"
                checked={terms}
                onCheckedChange={(v) => setTerms(v === true)}
              />
              <Label htmlFor="ds-terms">Conditions générales acceptées</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ds-notif" checked={notifications} onCheckedChange={setNotifications} />
              <Label htmlFor="ds-notif">
                Notifications {notifications ? "activées" : "désactivées"}
              </Label>
            </div>
          </div>
        </Section>

        <Section
          id="badges"
          title="Badges"
          description="Statuts courts. La couleur complète toujours un libellé, jamais seule."
        >
          <Specimen label="variant : neutral · primary · success · warning · danger · info · outline">
            <Badge>Brouillon</Badge>
            <Badge variant="primary">Envoyé</Badge>
            <Badge variant="success">Payée</Badge>
            <Badge variant="warning">Échéance proche</Badge>
            <Badge variant="danger">En retard</Badge>
            <Badge variant="info">Nouveau</Badge>
            <Badge variant="outline">Interne</Badge>
          </Specimen>
        </Section>

        <Section
          id="cartes"
          title="Cartes"
          description="Conteneur de base des tableaux de bord et des fiches."
        >
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Chiffre d&apos;affaires du mois</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">48 250 €</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="success">+12,4 % vs mois précédent</Badge>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Dupont & Fils SARL</CardTitle>
                <CardDescription>Client depuis mars 2024 · Cahors</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>MD</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">Marie Dupont</p>
                  <p className="text-muted-foreground">Gérante</p>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="secondary" size="sm">
                  Ouvrir la fiche
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        <Section
          id="navigation"
          title="Onglets et menus"
          description="Onglets pour les vues d'un même objet, menus pour les actions secondaires."
        >
          <div className="flex items-start gap-6 rounded-lg border border-border bg-card p-5">
            <Tabs defaultValue="apercu" className="flex-1">
              <TabsList>
                <TabsTrigger value="apercu">Aperçu</TabsTrigger>
                <TabsTrigger value="activite">Activité</TabsTrigger>
                <TabsTrigger value="fichiers">Fichiers</TabsTrigger>
              </TabsList>
              <TabsContent value="apercu" className="text-sm text-muted-foreground">
                Contenu de l&apos;onglet « Aperçu ».
              </TabsContent>
              <TabsContent value="activite" className="text-sm text-muted-foreground">
                Contenu de l&apos;onglet « Activité ».
              </TabsContent>
              <TabsContent value="fichiers" className="text-sm text-muted-foreground">
                Contenu de l&apos;onglet « Fichiers ».
              </TabsContent>
            </Tabs>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Plus d'actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Facture FA-2026-0142</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => toast("Mode édition (démonstration).")}>
                  <PencilIcon />
                  Modifier
                  <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("Facture dupliquée (démonstration).")}>
                  <CopyIcon />
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={demoDelete}>
                  <Trash2Icon />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        <Section
          id="retours"
          title="Retours et superpositions"
          description="Toasts avec « Annuler » après une modification, fenêtres de confirmation, infobulles."
        >
          <Specimen label="toast · dialog · tooltip · kbd">
            <Button variant="secondary" onClick={demoDelete}>
              Afficher un toast
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Ouvrir une confirmation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer ce devis ?</DialogTitle>
                  <DialogDescription>
                    Le devis DE-2026-0087 ira dans la corbeille, où il restera 30 jours.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Annuler</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={demoDelete}>
                      Supprimer
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Survolez-moi</Button>
              </TooltipTrigger>
              <TooltipContent>
                Une aide courte <Kbd>?</Kbd>
              </TooltipContent>
            </Tooltip>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </Specimen>
        </Section>

        <Section
          id="etats"
          title="Chargement et états vides"
          description="Des squelettes à la forme du contenu, jamais d'écran blanc ; des états vides qui proposent l'étape suivante."
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Separator />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <EmptyState
              icon={<InboxIcon />}
              title="Aucun ticket ouvert"
              description="Les demandes de vos clients arriveront ici. Connectez votre boîte de support pour commencer."
              action={
                <Button size="sm" onClick={() => toast("Action d'état vide (démonstration).")}>
                  <PlusIcon />
                  Créer un ticket
                </Button>
              }
            />
          </div>
        </Section>
      </div>

      <nav
        aria-label="Sections du design system"
        className="sticky top-8 hidden h-fit w-48 shrink-0 xl:block"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">Sur cette page</p>
        <ul className="space-y-1 border-l border-border">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="-ml-px block border-l border-transparent py-0.5 pl-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
