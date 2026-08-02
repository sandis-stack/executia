import { loadProductionEnv } from "./env";
import { buildServer } from "./server";

async function main() {
  const env = loadProductionEnv();
  const app = await buildServer({ env });
  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`executia-api failed to start: ${message}`);
  process.exit(1);
});
