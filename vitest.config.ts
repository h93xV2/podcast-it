import path from "node:path";
import { defineWorkersProject, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
    const migrationsPath = path.join(__dirname, "migrations");
    const migrations = await readD1Migrations(migrationsPath);

    return {
        test: {
            setupFiles: ["./tests/apply-migrations.ts"],
            poolOptions: {
                workers: {
                    miniflare: {
                        compatibilityDate: "2025-08-03",
                        d1Databases: { DB: ":memory:" },
                        d1Persist: false,
                        bindings: { TEST_MIGRATIONS: migrations },
                        r2Buckets: ["podcasts"],
                        queueProducers: {
                            episodes: { queueName: "episodes" },
                        },
                    },
                },
            },
        },
    };
});
