// Copie unique d'une base Quercy vers une autre (changement de région de la base).
//
//   DB_COPY_FROM=<ancienne base> DATABASE_URL=<nouvelle base> node scripts/copy-database.mjs
//
// La nouvelle base doit avoir le schéma à jour (prisma migrate deploy) et être vide : si elle
// contient déjà une entreprise, rien n'est fait (relancer la construction ne recopie pas).
// L'ancienne base n'est que lue. Tout est copié dans une seule transaction : en cas d'erreur,
// la nouvelle base reste vide et la construction échoue (la version en ligne ne change pas).
import { PrismaClient } from "@prisma/client";

const fromUrl = process.env.DB_COPY_FROM;
const toUrl = process.env.DATABASE_URL;
if (!fromUrl || !toUrl) throw new Error("DB_COPY_FROM et DATABASE_URL sont requis.");
if (fromUrl === toUrl) throw new Error("DB_COPY_FROM et DATABASE_URL désignent la même base.");

const from = new PrismaClient({ datasources: { db: { url: fromUrl } } });
const to = new PrismaClient({ datasources: { db: { url: toUrl } } });
const quote = (name) => `"${name.replaceAll('"', '""')}"`;

async function tables(client) {
  const rows = await client.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`,
  );
  return rows.map((r) => r.tablename);
}

async function count(client, table) {
  const [row] = await client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${quote(table)}`);
  return row.n;
}

try {
  if ((await count(to, "organization")) > 0) {
    console.log("Copie de la base : la nouvelle base contient déjà des données, rien n'est copié.");
    process.exit(0);
  }
  const source = await tables(from);
  const target = new Set(await tables(to));
  const missing = source.filter((t) => !target.has(t));
  if (missing.length)
    throw new Error(`Tables absentes de la nouvelle base : ${missing.join(", ")}`);

  // Clés étrangères vérifiées en fin de transaction : l'ordre des tables n'importe plus.
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
          const [row] = await from.$queryRawUnsafe(
            `SELECT count(*)::int AS n, coalesce(json_agg(t), '[]')::text AS data FROM ${quote(table)} t`,
          );
          expected[table] = row.n;
          if (!row.n) continue;
          await tx.$executeRawUnsafe(
            `INSERT INTO ${quote(table)} SELECT * FROM json_populate_recordset(NULL::${quote(table)}, $1::json) ON CONFLICT DO NOTHING`,
            row.data,
          );
          console.log(`  ${table} : ${row.n}`);
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
} finally {
  await from.$disconnect();
  await to.$disconnect();
}
