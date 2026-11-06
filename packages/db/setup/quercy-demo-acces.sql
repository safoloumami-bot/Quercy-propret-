-- Quercy : donne accès à l'espace « Quercy Propreté (démo) » à TOUS les comptes créés sur le site
-- (quelle que soit l'adresse e-mail utilisée), et l'ouvre à la prochaine page.
-- À exécuter dans le SQL Editor de Neon APRÈS quercy-demo-neon.sql. Peut être relancé.
INSERT INTO membership (id, "organizationId", "userId", "roleId", "createdAt", "updatedAt")
SELECT 'demo_owner_' || u.id, r."organizationId", u.id, r.id, now(), now()
FROM "user" u
JOIN role r ON r."organizationId" = 'quercy_demo_org' AND r."systemKey" = 'owner'
WHERE u.email NOT LIKE '%@quercy.app'
ON CONFLICT ("organizationId", "userId") DO UPDATE SET "deletedAt" = NULL, "roleId" = EXCLUDED."roleId";

UPDATE session SET "activeOrganizationId" = 'quercy_demo_org'
WHERE "userId" IN (SELECT id FROM "user" WHERE email NOT LIKE '%@quercy.app');

-- Vérification : une ligne par compte ayant accès à la démonstration.
SELECT u.email AS compte, o.name AS espace
FROM membership m JOIN "user" u ON u.id = m."userId" JOIN organization o ON o.id = m."organizationId"
WHERE o.id = 'quercy_demo_org' AND u.email NOT LIKE '%@quercy.app';
