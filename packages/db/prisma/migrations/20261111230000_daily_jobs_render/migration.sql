-- Les tâches du matin passent de Netlify à Render. Si elles ont déjà pu partir aujourd'hui
-- (après 5 h UTC, heure de la fonction planifiée Netlify), la journée est marquée comme
-- faite : Render commencera demain, et aucune relance ne part en double.
INSERT INTO "platform_state" ("key", "value", "updatedAt")
SELECT 'daily-jobs', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'), now()
WHERE EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') >= 5
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now()
WHERE "platform_state"."value" < EXCLUDED."value";
