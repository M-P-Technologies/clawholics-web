// Runs the Postgres integration tests (src/tests/db) against a throwaway Docker Postgres,
// then removes the container. Never touches the Supabase project.
//
//   npm run test:db         (needs Docker)
//   TEST_DATABASE_URL=... npm run test:db   (an existing localhost test database; its
//                                                   public schema is dropped and rebuilt)

import { spawnSync } from "node:child_process";

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

let url = process.env.TEST_DATABASE_URL;
let container;

if (!url) {
  container = `clawholics-test-db-${process.pid}`;
  const port = 55000 + (process.pid % 1000);
  const started = run("docker", ["run", "-d", "--rm", "--name", container, "-e", "POSTGRES_PASSWORD=test", "-p", `${port}:5432`, "postgres:17"], { stdio: "ignore" });
  if (started.status !== 0) {
    console.error("Could not start a Postgres container. Is Docker running?");
    process.exit(1);
  }
  url = `postgres://postgres:test@localhost:${port}/postgres`;

  // pg_isready can report ready during the image's init restart, so require a few in a row
  let ready = 0;
  for (let i = 0; i < 60 && ready < 3; i++) {
    const check = run("docker", ["exec", container, "pg_isready", "-U", "postgres", "-h", "localhost"], { stdio: "ignore" });
    ready = check.status === 0 ? ready + 1 : 0;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
}

const result = run("npx", ["vitest", "run", "src/tests/db", "--no-file-parallelism"], { env: { ...process.env, TEST_DATABASE_URL: url } });

if (container) run("docker", ["rm", "-f", container], { stdio: "ignore" });
process.exit(result.status ?? 1);
