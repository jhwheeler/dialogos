import { buildApp } from "./app.js";
import { parseEnv } from "./lib/env.js";
async function main() {
    const env = parseEnv();
    const app = buildApp();
    await app.listen({
        host: env.HOST,
        port: env.PORT,
    });
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
