-- Quercy devient sebt : les espaces restés sur l'ancien vert par défaut passent au bronze sebt.
-- Une couleur choisie par l'entreprise (autre que l'ancien défaut) est conservée.
UPDATE "organization"
SET "preferences" = jsonb_set("preferences"::jsonb, '{accentColor}', '"#82623A"')
WHERE upper("preferences"::jsonb ->> 'accentColor') = '#0F6E5E';
