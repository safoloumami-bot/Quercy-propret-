"use client";

import {
  WEBSITE_SECTIONS,
  WEEK_DAYS,
  type WebsiteContent,
  type WebsiteImage,
  type WebsiteSectionKey,
  type WebsiteTheme,
} from "@quercy/core";
import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Callout } from "@quercy/ui/components/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@quercy/ui/components/card";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { Switch } from "@quercy/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@quercy/ui/components/tabs";
import { Textarea } from "@quercy/ui/components/textarea";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ImagePlusIcon,
  Loader2Icon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { errorMessage, useTRPC } from "@/lib/trpc";

import { uploadSiteImage } from "./upload";

type Images = Record<string, string>;

/** Envois de photos en cours : on n'enregistre ni ne publie pendant un envoi. */
const UploadsContext = React.createContext<(delta: number) => void>(() => {});
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Choix d'une photo : envoi (redimensionnée), aperçu, retrait. */
function PhotoPicker({
  label,
  value,
  images,
  onUploaded,
  onChange,
  disabled,
  aspect = "aspect-[16/9]",
}: {
  label: string;
  value: WebsiteImage | null;
  images: Images;
  onUploaded: (fileId: string, url: string) => void;
  onChange: (value: WebsiteImage | null) => void;
  disabled: boolean;
  aspect?: string;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const track = React.useContext(UploadsContext);
  const src = value ? images[value.fileId] : undefined;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    track(1);
    try {
      const { fileId, url } = await uploadSiteImage(file);
      onUploaded(fileId, url);
      onChange({ fileId, alt: value?.alt ?? "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      track(-1);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed",
          aspect,
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu d'une photo envoyée
          <img
            src={src}
            alt={value?.alt ?? ""}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="flex items-center gap-2">
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ImagePlusIcon className="size-4" />
            )}
            {busy ? "Envoi…" : "Ajouter une photo"}
          </span>
        )}
        {src && busy ? (
          <span className="absolute inset-0 grid place-items-center bg-background/60">
            <Loader2Icon className="size-5 animate-spin" />
          </span>
        ) : null}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center gap-2">
          <Input
            aria-label="Description de la photo (pour l'accessibilité et le référencement)"
            placeholder="Décrivez la photo en quelques mots"
            value={value.alt}
            disabled={disabled}
            maxLength={200}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Retirer la photo"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function WebsiteEditor() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(trpc.website.get.queryOptions());
  const [content, setContent] = React.useState<WebsiteContent | null>(null);
  const [theme, setTheme] = React.useState<WebsiteTheme | null>(null);
  const [images, setImages] = React.useState<Images>({});
  const [dirty, setDirty] = React.useState(false);
  const [uploads, setUploads] = React.useState(0);
  const trackUploads = React.useCallback(
    (delta: number) => setUploads((n) => Math.max(0, n + delta)),
    [],
  );
  /** Numéro de version local : une modification faite pendant l'enregistrement n'est pas perdue. */
  const revision = React.useRef(0);
  const [domain, setDomain] = React.useState("");
  const [slug, setSlug] = React.useState("");

  const site = query.data?.site ?? null;
  const canEdit = query.data?.canEdit ?? false;

  React.useEffect(() => {
    if (site && !dirty) {
      setContent(site.draft);
      setTheme(site.theme);
      setImages((i) => ({ ...i, ...site.images }));
      setSlug(site.slug);
    }
  }, [site, dirty]);

  const refresh = () => queryClient.invalidateQueries(trpc.website.pathFilter());
  const create = useMutation(
    trpc.website.create.mutationOptions({
      onSuccess: () => void refresh(),
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const save = useMutation(trpc.website.save.mutationOptions());
  const publish = useMutation(trpc.website.publish.mutationOptions());
  const unpublish = useMutation(
    trpc.website.unpublish.mutationOptions({
      onSuccess: () => {
        toast.success("Site retiré : il n'est plus visible.");
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const setSlugMut = useMutation(
    trpc.website.setSlug.mutationOptions({
      onSuccess: () => {
        toast.success("Adresse du site modifiée.");
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const addDomain = useMutation(
    trpc.website.addDomain.mutationOptions({
      onSuccess: () => {
        setDomain("");
        toast.success("Domaine ajouté. Il reste à le faire pointer vers le site.");
        void refresh();
      },
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );
  const removeDomain = useMutation(
    trpc.website.removeDomain.mutationOptions({
      onSuccess: () => void refresh(),
      onError: (e) => toast.error(errorMessage(e)),
    }),
  );

  function update(fn: (c: WebsiteContent) => WebsiteContent) {
    setContent((c) => (c ? fn(c) : c));
    revision.current += 1;
    setDirty(true);
  }
  function updateTheme(values: Partial<WebsiteTheme>) {
    setTheme((t) => (t ? { ...t, ...values } : t));
    revision.current += 1;
    setDirty(true);
  }
  const uploaded = (fileId: string, url: string) => setImages((i) => ({ ...i, [fileId]: url }));

  async function saveDraft(silent = false) {
    if (!content || !theme) return false;
    const saving = revision.current;
    try {
      await save.mutateAsync({ content, theme });
      if (revision.current === saving) setDirty(false);
      await refresh();
      if (!silent) toast.success("Modifications enregistrées. Publiez pour les mettre en ligne.");
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  async function publishNow() {
    if (uploads > 0) return;
    if (dirty && !(await saveDraft(true))) return;
    try {
      const r = await publish.mutateAsync();
      toast.success(`Site publié : ${r.url}`);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-8 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (query.isError) {
    return <p className="p-8 text-sm text-destructive">{errorMessage(query.error)}</p>;
  }

  if (!site) {
    return (
      <div className="mx-auto w-full max-w-3xl px-8 py-16">
        <Card>
          <CardHeader>
            <GlobeIcon className="size-6 text-primary" aria-hidden />
            <CardTitle className="mt-3 text-xl">Votre site, modifiable par vous</CardTitle>
            <CardDescription>
              Changez vos photos, vos textes, vos horaires et vos prestations quand vous voulez : le
              site se met à jour dès que vous publiez. Il est prérempli avec ce que le logiciel sait
              déjà de votre entreprise ; vos prestations viennent de votre catalogue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => create.mutate()} disabled={!canEdit || create.isPending}>
              <PlusIcon /> {create.isPending ? "Création…" : "Créer mon site"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!content || !theme) return null;
  const disabled = !canEdit;
  const status = !site.isPublished
    ? { label: "Pas encore en ligne", variant: "neutral" as const }
    : site.hasChanges || dirty
      ? { label: "Modifications à publier", variant: "warning" as const }
      : { label: "En ligne", variant: "success" as const };

  return (
    <UploadsContext.Provider value={trackUploads}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-8 py-8">
        <PageHeader
          title="Mon site"
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {site.publishedAt ? (
                <span>Publié le {dateFmt.format(new Date(site.publishedAt))}</span>
              ) : null}
              {site.isPublished ? (
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  {site.url.replace("https://", "")} <ExternalLinkIcon className="size-3" />
                </a>
              ) : null}
            </span>
          }
          actions={
            canEdit ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void saveDraft()}
                  disabled={!dirty || save.isPending || uploads > 0}
                >
                  {uploads > 0
                    ? "Envoi des photos…"
                    : save.isPending
                      ? "Enregistrement…"
                      : "Enregistrer"}
                </Button>
                <Button
                  onClick={() => void publishNow()}
                  disabled={publish.isPending || uploads > 0 || (!dirty && !site.hasChanges)}
                >
                  <SendIcon /> {publish.isPending ? "Publication…" : "Publier"}
                </Button>
              </>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Tabs defaultValue="accueil" className="min-w-0">
            <TabsList className="flex-wrap">
              <TabsTrigger value="accueil">Accueil</TabsTrigger>
              <TabsTrigger value="presentation">Présentation</TabsTrigger>
              <TabsTrigger value="prestations">Prestations</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="actualites">Actualités</TabsTrigger>
              <TabsTrigger value="horaires">Horaires</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="reglages">Réglages</TabsTrigger>
            </TabsList>

            <TabsContent value="accueil" className="space-y-5 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="w-name" label="Nom affiché">
                  <Input
                    id="w-name"
                    value={content.name}
                    maxLength={80}
                    disabled={disabled}
                    onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
                  />
                </Field>
                <Field
                  id="w-eyebrow"
                  label="Petite ligne au-dessus du titre"
                  hint="Ex. : Plombier chauffagiste depuis 2008"
                >
                  <Input
                    id="w-eyebrow"
                    value={content.hero.eyebrow}
                    maxLength={80}
                    disabled={disabled}
                    onChange={(e) =>
                      update((c) => ({ ...c, hero: { ...c.hero, eyebrow: e.target.value } }))
                    }
                  />
                </Field>
              </div>
              <Field id="w-title" label="Titre de l'accueil">
                <Input
                  id="w-title"
                  value={content.hero.title}
                  maxLength={120}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, hero: { ...c.hero, title: e.target.value } }))
                  }
                />
              </Field>
              <Field id="w-subtitle" label="Phrase d'accroche">
                <Textarea
                  id="w-subtitle"
                  rows={3}
                  value={content.hero.subtitle}
                  maxLength={300}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, hero: { ...c.hero, subtitle: e.target.value } }))
                  }
                />
              </Field>
              <Field id="w-cta" label="Texte du bouton" hint="Il mène au formulaire de contact.">
                <Input
                  id="w-cta"
                  value={content.hero.ctaLabel}
                  maxLength={40}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, hero: { ...c.hero, ctaLabel: e.target.value } }))
                  }
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
                <PhotoPicker
                  label="Photo d'accueil"
                  value={content.hero.image}
                  images={images}
                  onUploaded={uploaded}
                  disabled={disabled}
                  onChange={(image) => update((c) => ({ ...c, hero: { ...c.hero, image } }))}
                />
                <PhotoPicker
                  label="Logo"
                  value={content.logo}
                  images={images}
                  onUploaded={uploaded}
                  disabled={disabled}
                  aspect="aspect-square"
                  onChange={(logo) => update((c) => ({ ...c, logo }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="presentation" className="space-y-5 pt-4">
              <Field id="w-about-title" label="Titre">
                <Input
                  id="w-about-title"
                  value={content.about.title}
                  maxLength={120}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, about: { ...c.about, title: e.target.value } }))
                  }
                />
              </Field>
              <Field
                id="w-about-text"
                label="Votre présentation"
                hint="Votre histoire, votre savoir-faire, ce qui vous distingue. Laissez une ligne vide entre deux paragraphes."
              >
                <Textarea
                  id="w-about-text"
                  rows={10}
                  value={content.about.text}
                  maxLength={3000}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, about: { ...c.about, text: e.target.value } }))
                  }
                />
              </Field>
              <div className="max-w-md">
                <PhotoPicker
                  label="Photo de présentation"
                  value={content.about.image}
                  images={images}
                  onUploaded={uploaded}
                  disabled={disabled}
                  aspect="aspect-[4/3]"
                  onChange={(image) => update((c) => ({ ...c, about: { ...c.about, image } }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="prestations" className="space-y-5 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="w-svc-title" label="Titre">
                  <Input
                    id="w-svc-title"
                    value={content.services.title}
                    maxLength={120}
                    disabled={disabled}
                    onChange={(e) =>
                      update((c) => ({ ...c, services: { ...c.services, title: e.target.value } }))
                    }
                  />
                </Field>
                <Field id="w-svc-intro" label="Introduction">
                  <Input
                    id="w-svc-intro"
                    value={content.services.intro}
                    maxLength={500}
                    disabled={disabled}
                    onChange={(e) =>
                      update((c) => ({ ...c, services: { ...c.services, intro: e.target.value } }))
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={content.services.fromCatalog}
                  disabled={disabled}
                  onCheckedChange={(v) =>
                    update((c) => ({ ...c, services: { ...c.services, fromCatalog: v } }))
                  }
                />
                Afficher les prestations de mon catalogue (toujours à jour avec le logiciel)
              </label>
              {content.services.fromCatalog ? (
                <>
                  <label className="flex items-center gap-3 text-sm">
                    <Switch
                      checked={content.services.showPrices}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        update((c) => ({ ...c, services: { ...c.services, showPrices: v } }))
                      }
                    />
                    Afficher les prix (HT)
                  </label>
                  <Field
                    id="w-svc-cat"
                    label="Catégories affichées"
                    hint="Séparées par des virgules. Laissez vide pour tout afficher."
                  >
                    <Input
                      id="w-svc-cat"
                      value={content.services.categories.join(", ")}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          services: {
                            ...c.services,
                            categories: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean)
                              .slice(0, 20),
                          },
                        }))
                      }
                    />
                  </Field>
                </>
              ) : null}
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {content.services.fromCatalog
                    ? "Prestations en plus du catalogue"
                    : "Vos prestations"}
                </p>
                {content.services.items.map((item, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_140px_auto]"
                  >
                    <Input
                      aria-label="Prestation"
                      placeholder="Nom de la prestation"
                      value={item.name}
                      maxLength={120}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          services: {
                            ...c.services,
                            items: c.services.items.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          },
                        }))
                      }
                    />
                    <Input
                      aria-label="Prix"
                      placeholder="Prix (ex. dès 90 €)"
                      value={item.price}
                      maxLength={40}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          services: {
                            ...c.services,
                            items: c.services.items.map((x, j) =>
                              j === i ? { ...x, price: e.target.value } : x,
                            ),
                          },
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Retirer la prestation"
                      disabled={disabled}
                      onClick={() =>
                        update((c) => ({
                          ...c,
                          services: {
                            ...c.services,
                            items: c.services.items.filter((_, j) => j !== i),
                          },
                        }))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                    <Textarea
                      aria-label="Description"
                      placeholder="Description (facultatif)"
                      rows={2}
                      className="sm:col-span-3"
                      value={item.description}
                      maxLength={500}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          services: {
                            ...c.services,
                            items: c.services.items.map((x, j) =>
                              j === i ? { ...x, description: e.target.value } : x,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled || content.services.items.length >= 40}
                  onClick={() =>
                    update((c) => ({
                      ...c,
                      services: {
                        ...c.services,
                        items: [...c.services.items, { name: "", description: "", price: "" }],
                      },
                    }))
                  }
                >
                  <PlusIcon /> Ajouter une prestation
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="space-y-5 pt-4">
              <Field id="w-gal-title" label="Titre de la galerie">
                <Input
                  id="w-gal-title"
                  value={content.gallery.title}
                  maxLength={120}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, gallery: { ...c.gallery, title: e.target.value } }))
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {content.gallery.images.map((img, i) => (
                  <div key={`${img.fileId}-${i}`} className="space-y-2">
                    <PhotoPicker
                      label={`Photo ${i + 1}`}
                      value={img}
                      images={images}
                      onUploaded={uploaded}
                      disabled={disabled}
                      aspect="aspect-[4/3]"
                      onChange={(value) =>
                        update((c) => ({
                          ...c,
                          gallery: {
                            ...c.gallery,
                            images: value
                              ? c.gallery.images.map((x, j) => (j === i ? value : x))
                              : c.gallery.images.filter((_, j) => j !== i),
                          },
                        }))
                      }
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Avancer la photo"
                        disabled={disabled || i === 0}
                        onClick={() =>
                          update((c) => ({
                            ...c,
                            gallery: { ...c.gallery, images: move(c.gallery.images, i, -1) },
                          }))
                        }
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Reculer la photo"
                        disabled={disabled || i === content.gallery.images.length - 1}
                        onClick={() =>
                          update((c) => ({
                            ...c,
                            gallery: { ...c.gallery, images: move(c.gallery.images, i, 1) },
                          }))
                        }
                      >
                        <ArrowDownIcon />
                      </Button>
                    </div>
                  </div>
                ))}
                {content.gallery.images.length < 40 ? (
                  <PhotoPicker
                    label="Nouvelle photo"
                    value={null}
                    images={images}
                    onUploaded={uploaded}
                    disabled={disabled}
                    aspect="aspect-[4/3]"
                    onChange={(value) =>
                      value &&
                      update((c) => ({
                        ...c,
                        gallery: { ...c.gallery, images: [...c.gallery.images, value] },
                      }))
                    }
                  />
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="actualites" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Nouveau chantier, fermeture exceptionnelle, promotion… Les plus récentes
                s&apos;affichent en premier.
              </p>
              {content.news.map((n, i) => (
                <Card key={n.id}>
                  <CardContent className="grid gap-4 pt-6 sm:grid-cols-[1fr_220px]">
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                        <Input
                          aria-label="Titre de l'actualité"
                          value={n.title}
                          maxLength={160}
                          disabled={disabled}
                          onChange={(e) =>
                            update((c) => ({
                              ...c,
                              news: c.news.map((x, j) =>
                                j === i ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                        <Input
                          type="date"
                          aria-label="Date"
                          value={n.date}
                          disabled={disabled}
                          onChange={(e) =>
                            e.target.value &&
                            update((c) => ({
                              ...c,
                              news: c.news.map((x, j) =>
                                j === i ? { ...x, date: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <Textarea
                        aria-label="Texte"
                        rows={4}
                        value={n.text}
                        maxLength={3000}
                        disabled={disabled}
                        onChange={(e) =>
                          update((c) => ({
                            ...c,
                            news: c.news.map((x, j) =>
                              j === i ? { ...x, text: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          update((c) => ({ ...c, news: c.news.filter((_, j) => j !== i) }))
                        }
                      >
                        <Trash2Icon /> Supprimer
                      </Button>
                    </div>
                    <PhotoPicker
                      label="Photo"
                      value={n.image}
                      images={images}
                      onUploaded={uploaded}
                      disabled={disabled}
                      aspect="aspect-[4/3]"
                      onChange={(image) =>
                        update((c) => ({
                          ...c,
                          news: c.news.map((x, j) => (j === i ? { ...x, image } : x)),
                        }))
                      }
                    />
                  </CardContent>
                </Card>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || content.news.length >= 50}
                onClick={() =>
                  update((c) => ({
                    ...c,
                    sections: c.sections.includes("news")
                      ? c.sections
                      : [...c.sections.slice(0, 3), "news", ...c.sections.slice(3)],
                    news: [
                      {
                        id: Math.random().toString(36).slice(2, 12),
                        title: "Nouvelle actualité",
                        date: new Date().toISOString().slice(0, 10),
                        text: "",
                        image: null,
                      },
                      ...c.news,
                    ],
                  }))
                }
              >
                <PlusIcon /> Ajouter une actualité
              </Button>
            </TabsContent>

            <TabsContent value="horaires" className="space-y-4 pt-4">
              <div className="divide-y divide-border rounded-lg border border-border">
                {WEEK_DAYS.map((d) => {
                  const day = content.hours.days.find((x) => x.day === d.key) ?? {
                    day: d.key,
                    closed: true,
                    slots: [],
                  };
                  const setDay = (next: typeof day) =>
                    update((c) => ({
                      ...c,
                      hours: {
                        ...c.hours,
                        days: [...c.hours.days.filter((x) => x.day !== d.key), next].sort(
                          (a, b) =>
                            WEEK_DAYS.findIndex((w) => w.key === a.day) -
                            WEEK_DAYS.findIndex((w) => w.key === b.day),
                        ),
                      },
                    }));
                  return (
                    <div
                      key={d.key}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                    >
                      <span className="w-24 font-medium">{d.label}</span>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={!day.closed}
                          disabled={disabled}
                          onCheckedChange={(open) =>
                            setDay({
                              ...day,
                              closed: !open,
                              slots:
                                open && day.slots.length === 0
                                  ? [{ from: "09:00", to: "18:00" }]
                                  : day.slots,
                            })
                          }
                        />
                        {day.closed ? "Fermé" : "Ouvert"}
                      </label>
                      {!day.closed
                        ? day.slots.map((slot, si) => (
                            <span key={si} className="flex items-center gap-1">
                              <Input
                                type="time"
                                aria-label={`${d.label} : ouverture`}
                                className="w-28"
                                value={slot.from}
                                disabled={disabled}
                                onChange={(e) =>
                                  setDay({
                                    ...day,
                                    slots: day.slots.map((s, k) =>
                                      k === si ? { ...s, from: e.target.value } : s,
                                    ),
                                  })
                                }
                              />
                              –
                              <Input
                                type="time"
                                aria-label={`${d.label} : fermeture`}
                                className="w-28"
                                value={slot.to}
                                disabled={disabled}
                                onChange={(e) =>
                                  setDay({
                                    ...day,
                                    slots: day.slots.map((s, k) =>
                                      k === si ? { ...s, to: e.target.value } : s,
                                    ),
                                  })
                                }
                              />
                            </span>
                          ))
                        : null}
                      {!day.closed && !disabled ? (
                        day.slots.length < 2 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDay({
                                ...day,
                                slots: [...day.slots, { from: "14:00", to: "18:00" }],
                              })
                            }
                          >
                            + Seconde plage
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDay({ ...day, slots: day.slots.slice(0, 1) })}
                          >
                            Une seule plage
                          </Button>
                        )
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <Field
                id="w-hours-note"
                label="Note"
                hint="Ex. : Interventions d'urgence 7 j/7 sur appel."
              >
                <Input
                  id="w-hours-note"
                  value={content.hours.note}
                  maxLength={300}
                  disabled={disabled}
                  onChange={(e) =>
                    update((c) => ({ ...c, hours: { ...c.hours, note: e.target.value } }))
                  }
                />
              </Field>
            </TabsContent>

            <TabsContent value="contact" className="space-y-5 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["phone", "Téléphone", 40],
                    ["email", "Email", 200],
                    ["address", "Adresse", 200],
                    ["postalCode", "Code postal", 12],
                    ["city", "Ville", 80],
                    ["area", "Zone d'intervention", 200],
                  ] as const
                ).map(([key, label, max]) => (
                  <Field key={key} id={`w-contact-${key}`} label={label}>
                    <Input
                      id={`w-contact-${key}`}
                      value={content.contact[key]}
                      maxLength={max}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, contact: { ...c.contact, [key]: e.target.value } }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={content.contact.form}
                  disabled={disabled}
                  onCheckedChange={(v) =>
                    update((c) => ({ ...c, contact: { ...c.contact, form: v } }))
                  }
                />
                Formulaire de contact sur le site
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["facebook", "instagram", "linkedin"] as const).map((key) => (
                  <Field
                    key={key}
                    id={`w-social-${key}`}
                    label={key[0]!.toUpperCase() + key.slice(1)}
                  >
                    <Input
                      id={`w-social-${key}`}
                      placeholder="https://…"
                      value={content.social[key]}
                      maxLength={200}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, social: { ...c.social, [key]: e.target.value } }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reglages" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sections du site</CardTitle>
                  <CardDescription>Cochez celles à afficher et réglez leur ordre.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    ...content.sections,
                    ...WEBSITE_SECTIONS.map((s) => s.key).filter(
                      (k) => !content.sections.includes(k),
                    ),
                  ].map((key) => {
                    const on = content.sections.includes(key as WebsiteSectionKey);
                    const index = content.sections.indexOf(key as WebsiteSectionKey);
                    return (
                      <div key={key} className="flex items-center gap-3 text-sm">
                        <Switch
                          checked={on}
                          disabled={disabled}
                          aria-label={WEBSITE_SECTIONS.find((s) => s.key === key)?.label}
                          onCheckedChange={(v) =>
                            update((c) => ({
                              ...c,
                              sections: v
                                ? [...c.sections, key as WebsiteSectionKey]
                                : c.sections.filter((s) => s !== key),
                            }))
                          }
                        />
                        <span className={cn("flex-1", !on && "text-muted-foreground")}>
                          {WEBSITE_SECTIONS.find((s) => s.key === key)?.label}
                        </span>
                        {on ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Monter"
                              disabled={disabled || index === 0}
                              onClick={() =>
                                update((c) => ({ ...c, sections: move(c.sections, index, -1) }))
                              }
                            >
                              <ArrowUpIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Descendre"
                              disabled={disabled || index === content.sections.length - 1}
                              onClick={() =>
                                update((c) => ({ ...c, sections: move(c.sections, index, 1) }))
                              }
                            >
                              <ArrowDownIcon />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Apparence</CardTitle>
                  <CardDescription>
                    Réglée à la création du site ; modifiez-la avec modération.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-4">
                  {(
                    [
                      ["accent", "Couleur principale"],
                      ["background", "Fond"],
                      ["text", "Texte"],
                      ["soft", "Fond secondaire"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} id={`w-theme-${key}`} label={label}>
                      <input
                        id={`w-theme-${key}`}
                        type="color"
                        className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
                        value={theme[key]}
                        disabled={disabled}
                        onChange={(e) => updateTheme({ [key]: e.target.value.toUpperCase() })}
                      />
                    </Field>
                  ))}
                  <Field id="w-font" label="Typographie">
                    <select
                      id="w-font"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={theme.font}
                      disabled={disabled}
                      onChange={(e) =>
                        updateTheme({ font: e.target.value as WebsiteTheme["font"] })
                      }
                    >
                      <option value="sans">Moderne</option>
                      <option value="serif">Classique</option>
                    </select>
                  </Field>
                  <Field id="w-radius" label="Angles">
                    <select
                      id="w-radius"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={theme.radius}
                      disabled={disabled}
                      onChange={(e) =>
                        updateTheme({ radius: e.target.value as WebsiteTheme["radius"] })
                      }
                    >
                      <option value="net">Nets</option>
                      <option value="doux">Arrondis</option>
                      <option value="pilule">Très arrondis</option>
                    </select>
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Référencement et mentions légales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field id="w-seo-title" label="Titre dans Google" hint="70 caractères au plus.">
                    <Input
                      id="w-seo-title"
                      value={content.seo.title}
                      maxLength={70}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, seo: { ...c.seo, title: e.target.value } }))
                      }
                    />
                  </Field>
                  <Field
                    id="w-seo-desc"
                    label="Description dans Google"
                    hint="160 caractères au plus."
                  >
                    <Textarea
                      id="w-seo-desc"
                      rows={2}
                      value={content.seo.description}
                      maxLength={160}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, seo: { ...c.seo, description: e.target.value } }))
                      }
                    />
                  </Field>
                  <Field
                    id="w-legal-pub"
                    label="Éditeur du site"
                    hint="Raison sociale, forme, capital, adresse, SIRET, directeur de la publication."
                  >
                    <Textarea
                      id="w-legal-pub"
                      rows={3}
                      value={content.legal.publisher}
                      maxLength={400}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, legal: { ...c.legal, publisher: e.target.value } }))
                      }
                    />
                  </Field>
                  <Field
                    id="w-legal-host"
                    label="Hébergeur"
                    hint="Nom, adresse et téléphone de l'hébergeur."
                  >
                    <Input
                      id="w-legal-host"
                      value={content.legal.host}
                      maxLength={300}
                      disabled={disabled}
                      onChange={(e) =>
                        update((c) => ({ ...c, legal: { ...c.legal, host: e.target.value } }))
                      }
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adresse et noms de domaine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (slug && slug !== site.slug) setSlugMut.mutate({ slug });
                    }}
                  >
                    <Field id="w-slug" label="Adresse du site" className="flex-1">
                      <div className="flex items-center gap-1">
                        <Input
                          id="w-slug"
                          value={slug}
                          disabled={disabled}
                          onChange={(e) => setSlug(e.target.value.toLowerCase())}
                        />
                        <span className="shrink-0 text-sm text-muted-foreground">
                          .{query.data?.sitesDomain}
                        </span>
                      </div>
                    </Field>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={disabled || slug === site.slug || setSlugMut.isPending}
                    >
                      Changer
                    </Button>
                  </form>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Noms de domaine personnels</p>
                    {site.domains.length ? (
                      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                        {site.domains.map((d) => (
                          <li key={d} className="flex items-center justify-between px-3 py-2">
                            {d}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Retirer ${d}`}
                              disabled={disabled}
                              onClick={() => removeDomain.mutate({ domain: d })}
                            >
                              <Trash2Icon />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun pour l&apos;instant.</p>
                    )}
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (domain.trim()) addDomain.mutate({ domain: domain.trim() });
                      }}
                    >
                      <Input
                        aria-label="Nom de domaine"
                        placeholder="dupont-plomberie.fr"
                        value={domain}
                        disabled={disabled}
                        onChange={(e) => setDomain(e.target.value)}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={disabled || !domain.trim() || addDomain.isPending}
                      >
                        Ajouter
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground">
                      Le domaine doit ensuite pointer vers le site : notre équipe s&apos;en charge.
                    </p>
                  </div>
                  {site.isPublished && canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => unpublish.mutate()}
                      disabled={unpublish.isPending}
                    >
                      Retirer le site de la circulation
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <aside className="space-y-4">
            {site.checklist.length ? (
              <Callout>
                <p className="font-medium">À compléter</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {site.checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Callout>
            ) : (
              <Callout variant="success">Votre site est complet.</Callout>
            )}
            <p className="text-xs text-muted-foreground">
              Vos modifications restent en brouillon tant que vous ne cliquez pas sur « Publier ».
              Le site public n&apos;affiche que la version publiée.
            </p>
          </aside>
        </div>
      </div>
    </UploadsContext.Provider>
  );
}
