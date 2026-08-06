import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...nextCoreWebVitals, ...nextTypescript],
    rules: {
        // Underscore prefix = "intentionally unused", the standard
        // typescript-eslint convention. Needed for things we can't just
        // delete: Next.js route handlers whose (request) arg is required
        // positionally but unused, destructured DB columns we're
        // deliberately discarding, and catch bindings we don't inspect.
        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
        }],
    },
}]);
