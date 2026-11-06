// Copie unique d'une base Quercy vers une autre (changement de région de la base).
//
// Deux façons de désigner l'ancienne base :
//   - DB_COPY_FROM=<ancienne base> : lue avec Prisma ;
//   - un serveur postgres_fdw « quercy_ancienne » créé dans la nouvelle base (avec sa
//     correspondance d'utilisateur) : la nouvelle base lit l'ancienne directement, sans
//     variable d'environnement. Le lien est supprimé après la copie.
//
// La nouvelle base (DATABASE_URL) doit avoir le schéma à jour (prisma migrate deploy) et être
// vide : si elle contient déjà une entreprise, rien n'est copié (relancer la construction ne
// recopie pas). L'ancienne base n'est que lue. Tout est copié dans une seule transaction : en
// cas d'erreur, la nouvelle base reste vide et la construction échoue (la version en ligne ne
// change pas).
//
// Garde-fou : en production (CONTEXT=production), une base sans aucune entreprise arrête la
// construction, sauf ALLOW_EMPTY_DATABASE=1 (première installation).
import { PrismaClient } from "@prisma/client";

const FOREIGN_SERVER = "quercy_ancienne";
const FOREIGN_SCHEMA = "ancienne";
const fromUrl = process.env.DB_COPY_FROM;
const toUrl = process.env.DATABASE_URL;
if (!toUrl) throw new Error("DATABASE_URL est requise.");
if (fromUrl && fromUrl === toUrl)
  throw new Error("DB_COPY_FROM et DATABASE_URL désignent la même base.");

const to = new PrismaClient({ datasources: { db: { url: toUrl } } });
const from = fromUrl ? new PrismaClient({ datasources: { db: { url: fromUrl } } }) : null;
const quote = (name) => `"${name.replaceAll('"', '""')}"`;

async function tables(client, schema = "public") {
  const rows = await client.$queryRawUnsafe(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relkind IN ('r', 'f') AND c.relname <> '_prisma_migrations'
     ORDER BY c.relname`,
    schema,
  );
  return rows.map((r) => r.name);
}

async function count(client, table, schema = "public") {
  const [row] = await client.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM ${quote(schema)}.${quote(table)}`,
  );
  return row.n;
}

async function columns(client, table) {
  const rows = await client.$queryRawUnsafe(
    `SELECT column_name AS c FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    table,
  );
  return rows.map((r) => quote(r.c)).join(", ");
}

async function hasForeignServer() {
  const rows = await to.$queryRawUnsafe(
    `SELECT 1 FROM pg_foreign_server WHERE srvname = $1`,
    FOREIGN_SERVER,
  );
  return rows.length > 0;
}

/** Copie toutes les tables de `source` dans une transaction, clés étrangères différées. */
async function copyAll(source, copyTable) {
  const fks = await to.$queryRawUnsafe(
    `SELECT conrelid::regclass::text AS tbl, conname FROM pg_constraint
     WHERE contype = 'f' AND connamespace = 'public'::regnamespace AND NOT condeferrable`,
  );
  const setDeferrable = (on) =>
    Promise.all(
      fks.map((fk) =>
        to.$executeRawUnsafe(
          `ALTER TABLE ${fk.tbl} ALTER CONSTRAINT ${quote(fk.conname)} ${on ? "DEFERRABLE" : "NOT DEFERRABLE"}`,
        ),
      ),
    );
  const expected = {};
  await setDeferrable(true);
  try {
    await to.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET CONSTRAINTS ALL DEFERRED");
        for (const table of source) {
          expected[table] = await copyTable(tx, table);
          if (expected[table]) console.log(`  ${table} : ${expected[table]}`);
        }
      },
      { timeout: 600_000, maxWait: 60_000 },
    );
  } finally {
    await setDeferrable(false);
  }
  for (const table of source) {
    const n = await count(to, table);
    if (n < expected[table]) throw new Error(`Copie incomplète : ${table} ${n}/${expected[table]}`);
  }
  console.log(`Copie de la base terminée : ${source.length} tables.`);
}

async function checkTables(source) {
  const target = new Set(await tables(to));
  const missing = source.filter((t) => !target.has(t));
  if (missing.length)
    throw new Error(`Tables absentes de la nouvelle base : ${missing.join(", ")}`);
}

try {
  const filled = (await count(to, "organization")) > 0;
  if (filled) {
    console.log("Copie de la base : la nouvelle base contient déjà des données, rien n'est copié.");
  } else if (from) {
    const source = await tables(from);
    await checkTables(source);
    await copyAll(source, async (tx, table) => {
      const [row] = await from.$queryRawUnsafe(
        `SELECT count(*)::int AS n, coalesce(json_agg(t), '[]')::text AS data FROM ${quote(table)} t`,
      );
      if (row.n)
        await tx.$executeRawUnsafe(
          `INSERT INTO ${quote(table)} SELECT * FROM json_populate_recordset(NULL::${quote(table)}, $1::json) ON CONFLICT DO NOTHING`,
          row.data,
        );
      return row.n;
    });
  } else if (await hasForeignServer()) {
    // Le schéma de la nouvelle base existe maintenant (types énumérés compris) : on peut
    // importer les tables de l'ancienne comme tables distantes.
    await to.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${FOREIGN_SCHEMA} CASCADE`);
    await to.$executeRawUnsafe(`CREATE SCHEMA ${FOREIGN_SCHEMA}`);
    await to.$executeRawUnsafe(
      `IMPORT FOREIGN SCHEMA public FROM SERVER ${FOREIGN_SERVER} INTO ${FOREIGN_SCHEMA}`,
    );
    const source = await tables(to, FOREIGN_SCHEMA);
    await checkTables(source);
    await copyAll(source, async (tx, table) => {
      const cols = await columns(to, table);
      const [row] = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM ${FOREIGN_SCHEMA}.${quote(table)}`,
      );
      if (row.n)
        await tx.$executeRawUnsafe(
          `INSERT INTO ${quote(table)} (${cols}) SELECT ${cols} FROM ${FOREIGN_SCHEMA}.${quote(table)} ON CONFLICT DO NOTHING`,
        );
      return row.n;
    });
    // Le lien (et le mot de passe de l'ancienne base qu'il contient) n'est plus utile.
    await to.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${FOREIGN_SCHEMA} CASCADE`);
    await to.$executeRawUnsafe(`DROP SERVER IF EXISTS ${FOREIGN_SERVER} CASCADE`);
  }

  if (
    process.env.CONTEXT === "production" &&
    process.env.ALLOW_EMPTY_DATABASE !== "1" &&
    (await count(to, "organization")) === 0
  ) {
    console.error(
      "ARRÊT : la base de production ne contient aucune entreprise. Mise en ligne annulée pour " +
        "ne pas afficher un logiciel vide (ALLOW_EMPTY_DATABASE=1 pour une première installation).",
    );
    process.exitCode = 1;
  }
} finally {
  await from?.$disconnect();
  await to.$disconnect();
}
