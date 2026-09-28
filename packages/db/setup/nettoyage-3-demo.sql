-- Données du module Nettoyage dans l'espace de démonstration (peut être relancé).
DELETE FROM intervention WHERE "organizationId" = 'quercy_demo_org';
DELETE FROM inspection WHERE "organizationId" = 'quercy_demo_org';
DELETE FROM cleaning_contract WHERE "organizationId" = 'quercy_demo_org';
DELETE FROM site WHERE "organizationId" = 'quercy_demo_org';

UPDATE organization SET modules = array_append(modules, 'cleaning')
WHERE (id = 'quercy_demo_org' OR industry = 'cleaning') AND NOT ('cleaning' = ANY(modules));
UPDATE role SET permissions = permissions || '{"cleaning":{"view":"all","create":"all","update":"all","delete":"all","export":"all","admin":"all"}}'::jsonb
WHERE "systemKey" IN ('owner', 'admin') AND NOT (permissions ? 'cleaning');
UPDATE role SET permissions = permissions || '{"cleaning":{"view":"all","create":"own","update":"own","delete":"own"}}'::jsonb
WHERE "systemKey" = 'member' AND NOT (permissions ? 'cleaning');

-- Agents : votre compte, puis Julien, Sophie et Camille (comptes fictifs).
DROP TABLE IF EXISTS demo_agents;
CREATE TEMP TABLE demo_agents AS
SELECT (row_number() OVER (ORDER BY ord)) - 1 AS n, id FROM (
  (SELECT u.id, 0 AS ord FROM "user" u JOIN membership m ON m."userId" = u.id AND m."organizationId" = 'quercy_demo_org'
   WHERE u.email NOT LIKE '%@quercy.app' ORDER BY u."createdAt" LIMIT 1)
  UNION ALL SELECT id, 1 FROM "user" WHERE email = 'julien.marty@quercy.app'
  UNION ALL SELECT id, 2 FROM "user" WHERE email = 'sophie.lacombe@quercy.app'
  UNION ALL SELECT id, 3 FROM "user" WHERE email = 'demo@quercy.app'
) a;

INSERT INTO site (id, "organizationId", name, "companyId", address, "postalCode", city, "surfaceM2", "openingHours", "accessCode", keys, instructions, status, "ownerId", "updatedAt")
SELECT 'demo_site_' || v.n, 'quercy_demo_org', v.name,
  (SELECT id FROM company WHERE "organizationId" = 'quercy_demo_org' AND "deletedAt" IS NULL ORDER BY "createdAt", id OFFSET v.n LIMIT 1),
  v.address, v.cp, v.city, v.surface, v.hours, v.code, v.keys, v.instr,
  CASE WHEN v.n = 11 THEN 'paused' ELSE 'active' END,
  (SELECT id FROM demo_agents WHERE n = v.n % (SELECT count(*) FROM demo_agents)), now()
FROM (VALUES
 (0,'Bureaux Cahors Centre','12 boulevard Gambetta','46000','Cahors',420,'Après 18 h','4682B','Badge n° 3 au coffre','Couper l''alarme dans les 30 s. Vider les corbeilles de tri séparément.'),
 (1,'Clinique du Pont Valentré','3 quai Champollion','46000','Cahors',1250,'6 h – 9 h',NULL,'Accueil : badge prestataire','Protocole bionettoyage : tenue complète, lavettes code couleur, désinfectant en chambres.'),
 (2,'Résidence Les Terrasses du Lot','28 rue des Jardins','46100','Figeac',680,'8 h – 12 h','1946','Trousseau bleu','Sortir les conteneurs le mardi soir, les rentrer le mercredi matin.'),
 (3,'Agence Crédit Quercy Gourdon','5 place de la Libération','46300','Gourdon',210,'Après 18 h 30','7731',NULL,'Ne pas toucher aux postes de travail. Vitres de façade une fois par mois.'),
 (4,'Hôtel du Causse','Route de Rocamadour','46500','Gramat',950,'10 h – 15 h',NULL,'Réception','Parties communes et salle de restaurant.'),
 (5,'Cabinet médical Saint-Céré','14 avenue Anatole-de-Monzie','46400','Saint-Céré',180,'Après 19 h','5520A','Boîte à clés, code 0412','Désinfection des poignées, plans de travail et salle d''attente.'),
 (6,'Entrepôt Logistique Souillac','ZA de Bourzolles','46200','Souillac',2400,'5 h – 7 h','0808','Portail : télécommande n° 2','Autolaveuse pour l''allée centrale. Bureaux et vestiaires à l''étage.'),
 (7,'Mairie annexe de Luzech','Place du Canal','46140','Luzech',320,'Mercredi après-midi',NULL,'Clé au secrétariat','Salle du conseil à préparer la veille des séances.'),
 (8,'Groupe scolaire Prayssac','Allée des Écoles','46220','Prayssac',1100,'16 h 45 – 20 h','2468',NULL,'Sanitaires désinfectés chaque jour.'),
 (9,'Showroom Garonne Cuisines','Avenue de la Gare','46090','Pradines',360,'Avant 9 h','9012',NULL,'Vitrines et plans d''exposition sans traces.'),
 (10,'Copropriété Le Clos Saint-Géry','7 rue Saint-Géry','46000','Cahors',540,'9 h – 12 h','3579','Trousseau vert','Halls, escaliers et ascenseur. Tapis d''entrée à aspirer.'),
 (11,'Pharmacie des Remparts','2 rue des Remparts','46100','Figeac',140,'Après 19 h 30','8642',NULL,'Sol de l''officine à la monobrosse une fois par mois.')
) AS v(n, name, address, cp, city, surface, hours, code, keys, instr);

INSERT INTO cleaning_contract (id, "organizationId", name, "siteId", "companyId", status, weekdays, "startTime", "durationMinutes", "agentId", "monthlyPriceCents", "startDate", "generatedUntil", description, "updatedAt")
SELECT 'demo_contract_' || v.n, 'quercy_demo_org', 'Entretien ' || s.name, s.id, s."companyId", v.status, v.days, v.start, v.minutes,
  (SELECT id FROM demo_agents WHERE n = v.n % (SELECT count(*) FROM demo_agents)), v.price * 100,
  current_date - 200, CASE WHEN v.status = 'active' THEN current_date + 21 END, v.descr, now()
FROM (VALUES
 (0,'{1,2,3,4,5}'::text[],'18:30',120,1480,'active','Bureaux, sanitaires, cuisine ; vitres intérieures tous les mois.'),
 (1,'{1,2,3,4,5,6}','06:00',180,3950,'active','Bionettoyage des chambres, couloirs, sanitaires et salle d''attente.'),
 (2,'{2,5}','08:30',150,690,'active','Halls, escaliers, ascenseur, local poubelles et conteneurs.'),
 (3,'{1,3,5}','18:45',90,520,'active','Sols, bureaux, sanitaires ; vitres de façade mensuelles.'),
 (4,'{0,1,2,3,4,5,6}','10:30',150,2890,'active','Parties communes, salle de restaurant, terrasse.'),
 (5,'{2,4}','19:15',75,430,'active','Désinfection des surfaces de contact et sols.'),
 (6,'{1,4}','05:00',210,1760,'active','Entrepôt (autolaveuse), bureaux et vestiaires.'),
 (7,'{3}','14:00',120,340,'active','Bureaux, salle du conseil, sanitaires.'),
 (8,'{1,2,4,5}','16:45',180,2350,'active','Classes, sanitaires, réfectoire.'),
 (9,'{2,5}','07:30',90,610,'active','Sols, vitrines, plans d''exposition.'),
 (10,'{1,4}','09:00',120,560,'active','Halls, escaliers, ascenseur, tapis.'),
 (11,'{6}','19:30',90,380,'suspended','Officine et réserve. Suspendu pendant les travaux.')
) AS v(n, days, start, minutes, price, status, descr)
JOIN site s ON s.id = 'demo_site_' || v.n;

-- 8 semaines d'historique pointé et 3 semaines de planning.
INSERT INTO intervention (id, "organizationId", title, "siteId", "contractId", "companyId", "ownerId", date, "startTime", "durationMinutes", status, "checkInAt", "checkOutAt", "workedMinutes", "signedBy", "signatureUrl", notes, "updatedAt")
SELECT 'demo_itv_' || c.id || '_' || to_char(d, 'YYYYMMDD'), c."organizationId", 'Entretien — ' || s.name, s.id, c.id, c."companyId",
  c."agentId", d, c."startTime", c."durationMinutes",
  CASE WHEN d >= current_date THEN 'planned' WHEN r < 0.04 THEN 'missed' ELSE 'done' END,
  CASE WHEN d < current_date AND r >= 0.04 THEN d + c."startTime"::time - interval '2 hours' + (r * 15) * interval '1 minute' END,
  CASE WHEN d < current_date AND r >= 0.04 THEN d + c."startTime"::time - interval '2 hours' + (r * 15 + c."durationMinutes" - 5) * interval '1 minute' END,
  CASE WHEN d < current_date AND r >= 0.04 THEN c."durationMinutes" - 5 END,
  CASE WHEN d < current_date AND r >= 0.6 THEN 'Accueil' END,
  CASE WHEN d < current_date AND r >= 0.6 THEN 'data:image/svg+xml;base64,' || replace(encode(convert_to('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><path d="M15 55 Q40 10 60 50 T100 45 Q120 15 140 55 T190 40 M50 66 L200 60" fill="none" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round"/></svg>', 'UTF8'), 'base64'), E'\n', '') END,
  CASE WHEN d < current_date AND r BETWEEN 0.3 AND 0.4 THEN 'Recharge de savon posée dans les sanitaires.' END,
  now()
FROM cleaning_contract c
JOIN site s ON s.id = c."siteId"
CROSS JOIN LATERAL generate_series(current_date - 56, CASE WHEN c.status = 'active' THEN current_date + 21 ELSE current_date - 20 END, interval '1 day') AS d
CROSS JOIN LATERAL (SELECT random() + 0 * extract(epoch FROM d) AS r) x
WHERE c."organizationId" = 'quercy_demo_org' AND extract(dow FROM d)::int::text = ANY(c.weekdays);

INSERT INTO intervention (id, "organizationId", title, "siteId", "companyId", "ownerId", date, "startTime", "durationMinutes", status, "updatedAt")
SELECT 'demo_itv_extra_' || v.n, 'quercy_demo_org', v.title, s.id, s."companyId", (SELECT id FROM demo_agents WHERE n = 0), current_date + v.days, '08:00', v.minutes, 'planned', now()
FROM (VALUES (4,3,'Remise en état après travaux — salle de restaurant',360),
             (8,9,'Grand ménage des vacances — groupe scolaire',480),
             (11,12,'Nettoyage de fin de chantier — pharmacie',300)) AS v(n, days, title, minutes)
JOIN site s ON s.id = 'demo_site_' || v.n;

-- Contrôles qualité des 3 derniers mois.
INSERT INTO inspection (id, "organizationId", title, "siteId", date, floors, sanitary, dusting, windows, bins, score, result, comments, "ownerId", "updatedAt")
SELECT 'demo_insp_' || g, 'quercy_demo_org', 'Contrôle qualité — ' || s.name, s.id, current_date - (g * 3 + 1),
  f, sa, du, w, b, sc, CASE WHEN sc >= 80 THEN 'compliant' WHEN sc >= 60 THEN 'to_improve' ELSE 'non_compliant' END,
  (ARRAY['Très bon niveau, client satisfait.','Traces sur les vitres de l''entrée.','Sanitaires à reprendre : distributeur vide.','Poussière sur les plinthes.','Rien à signaler.'])[1 + g % 5],
  (SELECT id FROM demo_agents WHERE n = 0), now()
FROM generate_series(0, 27) AS g
JOIN site s ON s.id = 'demo_site_' || (g % 11)
CROSS JOIN LATERAL (SELECT random() + 0 * g < 0.85 AS f, random() + 0 * g < 0.8 AS sa, random() + 0 * g < 0.85 AS du, random() + 0 * g < 0.75 AS w, random() + 0 * g < 0.9 AS b) x
CROSS JOIN LATERAL (SELECT (f::int + sa::int + du::int + w::int + b::int) * 20 AS sc) y;

SELECT (SELECT count(*) FROM site WHERE "organizationId" = 'quercy_demo_org') AS sites,
       (SELECT count(*) FROM cleaning_contract WHERE "organizationId" = 'quercy_demo_org') AS contrats,
       (SELECT count(*) FROM intervention WHERE "organizationId" = 'quercy_demo_org') AS interventions,
       (SELECT count(*) FROM inspection WHERE "organizationId" = 'quercy_demo_org') AS controles;
