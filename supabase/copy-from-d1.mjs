// Copies the D1 data into a Supabase (Postgres) database: the Phase 3 data move.
//
//   1. Export D1 (read-only SELECTs, one JSON file per table):
//        node supabase/export-d1.mjs <export-dir>
//   2. Load it:
//        node --env-file=.env.local supabase/copy-from-d1.mjs <export-dir> [--replace]
//
// Uses DATABASE_URL. Creates the schema from supabase/migrations when the database has none.
// Refuses a database that already has app rows unless --replace is passed, which empties the
// app tables first. Everything is loaded in one transaction, so a failure leaves no partial copy.
//
// D1 migrations that haven't run on the live D1 are applied to the rows here, the same way
// those migrations do it (001: categories from services.category, position = id; 002:
// pricing_mode 'tiered'; 003: empty contact fields; 004: default payment settings).

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const [exportDir, ...flags] = process.argv.slice(2);
const replace = flags.includes("--replace");
if (!exportDir) {
  console.error("Usage: node --env-file=.env.local supabase/copy-from-d1.mjs <export-dir> [--replace]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const load = (table) => {
  const file = path.join(exportDir, `${table}.json`);
  return readdirSync(exportDir).includes(`${table}.json`) ? JSON.parse(readFileSync(file, "utf8")) : [];
};

// Parents before children (foreign keys)
const TABLES = [
  "content", "home_carousel", "faqs", "terms_and_conditions",
  "nailist_categories", "service_categories", "services", "service_gallery",
  "nailists", "nailist_services", "nailist_day_offs", "nailist_time_slots",
  "users", "customer_profiles", "admin_profiles", "scan_history",
  "appointments", "payments", "site_settings", "payment_proofs",
];
const IDENTITY_TABLES = TABLES.filter((t) => !["nailist_services", "customer_profiles", "admin_profiles", "payments", "site_settings"].includes(t));

const target = new URL(process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

// D1 (pre-001) services -> categories, as 001_service_categories.sql derives them
function deriveCategories(services) {
  const byKey = new Map();
  for (const s of [...services].sort((a, b) => a.id - b.id)) {
    const name = String(s.category ?? "").trim();
    if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
  }
  return [...byKey.values()].map((name, i) => ({
    id: i + 1, name, slug: name.toLowerCase().replaceAll(" ", "-"), description: null, image: null, position: i + 1, is_active: 1,
  }));
}

function prepare() {
  const data = Object.fromEntries(TABLES.map((t) => [t, load(t)]));

  if (data.service_categories.length === 0) data.service_categories = deriveCategories(data.services);
  const categoryId = new Map(data.service_categories.map((c) => [c.name.toLowerCase(), c.id]));
  data.services = data.services.map((s) => ({
    category_id: categoryId.get(String(s.category ?? "").trim().toLowerCase()) ?? null,
    is_active: 1,
    pricing_mode: "tiered",
    ...s,
    // 001: position = id where it was still 0
    position: s.position ? s.position : s.id,
  }));
  return data;
}

async function main() {
  console.log(`Target: ${target.hostname} as ${target.username} (database ${target.pathname.slice(1)})`);
  const data = prepare();

  const [{ exists }] = await sql`select to_regclass('public.users') is not null as exists`;
  if (!exists) {
    console.log("No schema yet: applying supabase/migrations");
    const dir = path.resolve(import.meta.dirname, "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await sql.begin((tx) => tx.unsafe(readFileSync(path.join(dir, file), "utf8")));
      console.log(`  applied ${file}`);
    }
  }

  // Rows the migration inserts itself (nailist_categories, site_settings) don't count as data
  const existing = [];
  for (const t of TABLES.filter((t) => !["nailist_categories", "site_settings"].includes(t))) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(t)}`;
    if (n > 0) existing.push(`${t}=${n}`);
  }
  if (existing.length > 0 && !replace) {
    console.error(`The target already has data (${existing.join(", ")}). Pass --replace to empty it and copy again.`);
    process.exit(1);
  }

  await sql.begin(async (tx) => {
    if (existing.length > 0) {
      console.log("Emptying the app tables (--replace)");
      await tx.unsafe(`truncate ${TABLES.filter((t) => !["nailist_categories", "site_settings"].includes(t)).join(", ")} restart identity cascade`);
    }

    for (const table of TABLES) {
      const rows = data[table];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const conflict =
        table === "nailist_categories" ? tx`on conflict (id) do update set name = excluded.name`
        : table === "site_settings" ? tx`on conflict (key) do update set value = excluded.value`
        : tx``;
      for (let i = 0; i < rows.length; i += 500) {
        await tx`insert into ${tx(table)} ${tx(rows.slice(i, i + 500), columns)} ${conflict}`;
      }
      console.log(`  ${table}: ${rows.length}`);
    }

    // Explicit ids were inserted, so move each identity sequence past the largest one
    for (const table of IDENTITY_TABLES) {
      await tx.unsafe(
        `select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 0) + 1, false)`,
      );
    }

    // Check before committing
    for (const table of TABLES) {
      const [{ n }] = await tx`select count(*)::int as n from ${tx(table)}`;
      const expected = data[table].length;
      if (["nailist_categories", "site_settings"].includes(table) ? n < expected : n !== expected) {
        throw new Error(`${table}: expected ${expected} rows, found ${n}`);
      }
    }
  });

  console.log("Done: all rows copied and the counts match.");
}

main()
  .catch((error) => {
    console.error("Copy failed, no data was written:", error.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
