-- AlterTable
ALTER TABLE "anomaly" ADD COLUMN     "dedupeKey" TEXT;

-- AlterTable
ALTER TABLE "intervention_proof" ADD COLUMN     "clientRef" TEXT;

-- CreateTable
CREATE TABLE "intervention_task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervention_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_consumable" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervention_consumable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intervention_task_organizationId_interventionId_idx" ON "intervention_task"("organizationId", "interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "intervention_task_interventionId_sortOrder_key" ON "intervention_task"("interventionId", "sortOrder");

-- CreateIndex
CREATE INDEX "intervention_consumable_organizationId_interventionId_idx" ON "intervention_consumable"("organizationId", "interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "intervention_consumable_interventionId_sortOrder_key" ON "intervention_consumable"("interventionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_organizationId_dedupeKey_key" ON "anomaly"("organizationId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "intervention_proof_interventionId_clientRef_key" ON "intervention_proof"("interventionId", "clientRef");

-- AddForeignKey
ALTER TABLE "intervention_task" ADD CONSTRAINT "intervention_task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_task" ADD CONSTRAINT "intervention_task_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_task" ADD CONSTRAINT "intervention_task_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_consumable" ADD CONSTRAINT "intervention_consumable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_consumable" ADD CONSTRAINT "intervention_consumable_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;


SELECT quercy_install_tenant_security();

-- ─────────────── Reprise du relevé de l'application terrain (intervention.fieldData) ───────────────
-- Points de contrôle, consommables, photos et journal quittent le JSON pour leurs tables.
-- Rien n'est perdu : chaque ligne du JSON devient une ligne de table, puis la clé est retirée.

-- Points de contrôle, dans l'ordre (pièce puis élément).
INSERT INTO "intervention_task"
  ("id", "organizationId", "interventionId", "area", "label", "critical", "done", "doneAt", "reason", "sortOrder", "updatedAt")
SELECT
  'fdt' || md5(x.id || ':' || x.ri || ':' || x.ii),
  x."organizationId",
  x.id,
  COALESCE(x.room->>'n', ''),
  COALESCE(x.item->>'l', ''),
  COALESCE(x.item->>'crit', 'false') = 'true',
  COALESCE(x.item->>'ok', 'false') = 'true',
  CASE
    WHEN COALESCE(x.item->>'ok', 'false') = 'true' AND COALESCE(x.item->>'ts', '0') ~ '^[0-9]+$'
      AND (x.item->>'ts')::bigint > 0
    THEN to_timestamp((x.item->>'ts')::bigint / 1000.0)
  END,
  NULLIF(btrim(COALESCE(x.item->>'nc', '')), ''),
  (row_number() OVER (PARTITION BY x.id ORDER BY x.ri, x.ii) - 1)::int,
  CURRENT_TIMESTAMP
FROM (
  SELECT i.id, i."organizationId", r.room, r.ri, t.item, t.ii
  FROM "intervention" i
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(i."fieldData"->'pieces') = 'array' THEN i."fieldData"->'pieces' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS r(room, ri)
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(r.room->'items') = 'array' THEN r.room->'items' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS t(item, ii)
) x;

-- Consommables posés.
INSERT INTO "intervention_consumable"
  ("id", "organizationId", "interventionId", "label", "unit", "quantity", "sortOrder", "updatedAt")
SELECT
  'fdc' || md5(i.id || ':' || c.ci),
  i."organizationId",
  i.id,
  COALESCE(c.cons->>'l', ''),
  NULLIF(c.cons->>'u', ''),
  CASE WHEN COALESCE(c.cons->>'q', '') ~ '^[0-9]+$' THEN (c.cons->>'q')::int ELSE 0 END,
  (c.ci - 1)::int,
  CURRENT_TIMESTAMP
FROM "intervention" i
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(i."fieldData"->'cons') = 'array' THEN i."fieldData"->'cons' ELSE '[]'::jsonb END
) WITH ORDINALITY AS c(cons, ci);

-- Photos avant / après : preuves de l'intervention (le fichier reste le même).
INSERT INTO "intervention_proof"
  ("id", "organizationId", "interventionId", "siteId", "type", "fileId", "area", "clientRef", "authorId", "takenAt", "createdAt")
SELECT
  'fdp' || md5(i.id || ':' || COALESCE(p.photo->>'id', p.pi::text)),
  i."organizationId",
  i.id,
  i."siteId",
  CASE WHEN p.photo->>'slot' = 'apres' THEN 'photo_after' ELSE 'photo_before' END,
  f.id,
  NULLIF(p.photo->>'piece', ''),
  COALESCE(p.photo->>'id', 'photo-' || p.pi),
  f."uploadedById",
  CASE
    WHEN COALESCE(p.photo->>'ts', '') ~ '^[0-9]+$' AND (p.photo->>'ts')::bigint > 0
    THEN to_timestamp((p.photo->>'ts')::bigint / 1000.0)
    ELSE COALESCE(f."createdAt", CURRENT_TIMESTAMP)
  END,
  CURRENT_TIMESTAMP
FROM "intervention" i
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(i."fieldData"->'photos') = 'array' THEN i."fieldData"->'photos' ELSE '[]'::jsonb END
) WITH ORDINALITY AS p(photo, pi)
LEFT JOIN "stored_file" f ON f.id = p.photo->>'fileId' AND f."organizationId" = i."organizationId"
ON CONFLICT DO NOTHING;

-- Journal du chantier : chaque ligne devient un évènement (libellé, détail et auteur gardés).
CREATE TEMP TABLE fd_journal AS
SELECT
  i.id AS "interventionId",
  i."organizationId",
  j.ji,
  COALESCE(j.line->>'a', '') AS label,
  COALESCE(j.line->>'d', '') AS detail,
  COALESCE(j.line->>'par', '') AS author,
  CASE
    WHEN COALESCE(j.line->>'ts', '') ~ '^[0-9]+$' AND (j.line->>'ts')::bigint > 0
    THEN to_timestamp((j.line->>'ts')::bigint / 1000.0)
    ELSE i."updatedAt"
  END AS at,
  CASE COALESCE(j.line->>'a', '')
    WHEN 'Chantier créé' THEN 'created'
    WHEN 'Arrivée sur site' THEN 'started'
    WHEN 'Départ du site' THEN 'finished'
    WHEN 'Pointage corrigé' THEN 'time_corrected'
    WHEN 'Point validé' THEN 'task_done'
    WHEN 'Point décoché' THEN 'task_undone'
    WHEN 'Réserve' THEN 'task_reason'
    WHEN 'Signature du client' THEN 'signed'
    WHEN 'Signature effacée' THEN 'signature_cleared'
    WHEN 'Photo ajoutée' THEN 'photo_added'
    WHEN 'Photo supprimée' THEN 'photo_removed'
    WHEN 'Intervention clôturée' THEN 'completed'
    ELSE 'note'
  END AS type
FROM "intervention" i
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(i."fieldData"->'journal') = 'array' THEN i."fieldData"->'journal' ELSE '[]'::jsonb END
) WITH ORDINALITY AS j(line, ji);

-- Une action déjà inscrite au journal des évènements (même type, à 5 secondes près) reçoit
-- le libellé de l'application ; les autres lignes sont ajoutées.
UPDATE "intervention_event" e
SET "metadata" = e."metadata" || jsonb_build_object(
  'label', j.label, 'detail', j.detail, 'by', j.author, 'journalLine', j.ji
)
FROM fd_journal j
WHERE e."interventionId" = j."interventionId"
  AND e."type" = j.type
  AND NOT (e."metadata" ? 'label')
  AND abs(extract(epoch FROM e."at" - j.at)) <= 5;

INSERT INTO "intervention_event" ("id", "organizationId", "interventionId", "type", "at", "metadata")
SELECT
  'fdj' || md5(j."interventionId" || ':' || j.ji),
  j."organizationId",
  j."interventionId",
  j.type,
  j.at,
  jsonb_build_object(
    'label', j.label, 'detail', j.detail, 'by', j.author,
    'source', 'application terrain', 'migrated', true
  )
FROM fd_journal j
WHERE NOT EXISTS (
  SELECT 1 FROM "intervention_event" e
  WHERE e."interventionId" = j."interventionId"
    AND e."metadata"->>'journalLine' = j.ji::text
);

DROP TABLE fd_journal;

UPDATE "intervention"
SET "fieldData" = "fieldData" - 'pieces' - 'cons' - 'photos' - 'journal'
WHERE jsonb_typeof("fieldData") = 'object'
  AND "fieldData" ?| ARRAY['pieces', 'cons', 'photos', 'journal'];
