UPDATE product p SET name = v.n, "imageUrl" = '/catalogue/' || v.img || '.webp', description = v.d, "unitPrice" = COALESCE(v.price, p."unitPrice")
FROM (VALUES
 ('CONT-120','Poubelle roulante 120 L','poubelle-120l','Bac roulant marron, couvercle et poignée, norme EN 840.',NULL::float),
 ('CONT-240','Poubelle roulante 240 L','poubelle-240l','Bac roulant bleu pour le tri des papiers et emballages.',NULL),
 ('TRI-3','Poubelle de tri empilable','poubelle-tri','Module de tri à clapet (plastique, métal, papier), empilable.',39.9),
 ('SAC-100','Sacs poubelle 100 L (rouleau de 25)','sacs-poubelle','Sacs noirs renforcés 40 microns.',NULL),
 ('PEI-10','Peinture aérosol intérieur/extérieur (lot de 2)','peinture-aerosol','Séchage rapide, pour retouches après travaux.',14.5),
 ('ROU-180','Conteneur 4 roues 660 L','conteneur-660l','Conteneur à couvercle, 4 roues dont 2 à frein.',329),
 ('PIN-50','Corbeille de tri de bureau 26 L','corbeille-tri','Corbeille bleue « recyclage » pour les bureaux.',12.9),
 ('SEAU-25','Balai spray à réservoir','balai-spray','Balai à plat avec réservoir et gâchette, frange microfibre lavable.',NULL),
 ('BAL-30','Balai et pelle à poussière','balai-pelle','Balai à fibres synthétiques et pelle à lèvre caoutchouc.',NULL),
 ('FRA-1','Frange coton pour balai','frange','Frange à bandes 400 g, lavable à 90 °C.',9.9),
 ('CHA-MEN','Aspirateur eau et poussières 30 L','aspirateur-eau','Pour chantiers et locaux techniques.',289),
 ('DES-750','Spray désinfectant 500 ml','spray','Bactéricide et virucide, sans rinçage.',NULL),
 ('GAN-100','Gants nitrile (boîte de 100)','gants-nitrile','Sans poudre, tailles S à XL.',NULL),
 ('MIC-10','Lavettes microfibre (lot de 10)','microfibre','Codes couleurs : sanitaires, cuisine, bureaux.',NULL),
 ('ASP-15','Aspirateur traîneau professionnel','aspirateur','Poussières, 1 000 W, silencieux.',NULL),
 ('RAC-35','Nettoyeur haute pression','nettoyeur-hp','150 bars, pour façades et parkings.',449),
 ('PT-48','Papier toilette (colis de 48)','papier-toilette','Double épaisseur, fibres recyclées.',NULL),
 ('SAV-5','Savon mains 300 ml','savon-mains','Savon liquide doux à pompe, pH neutre.',5.5),
 ('KIT-ECO','Kit produits d''entretien','kit-produits','Seau, nettoyants, lessive et doseur.',NULL),
 ('DIS-EM','Distributeur de savon mural','distributeur-savon','Réservoir visible de 350 ml.',29),
 ('PAP-EM','Recharge papier essuie-mains (colis)','essuie-mains','Bobines à dévidage central.',NULL)
) AS v(sku, n, img, d, price)
WHERE p.sku = v.sku;

UPDATE product SET "imageUrl" = '/catalogue/' || v.img || '.webp'
FROM (VALUES ('ENT-BUR','aspirateur'),('ENT-QUO','balai-spray'),('VIT-H','spray'),('REM-M2','aspirateur-eau'),
 ('CHA-J','conteneur-660l'),('DES-MED','gants-nitrile'),('MOQ-M2','aspirateur'),('MAR-M2','frange'),
 ('URG','nettoyeur-hp'),('COP-M','balai-pelle'),('AUD','kit-produits')) AS v(sku, img)
WHERE product.sku = v.sku;

SELECT count(*) AS articles_avec_photo FROM product WHERE "imageUrl" LIKE '%.webp';
