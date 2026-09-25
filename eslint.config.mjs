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
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-require-imports": "warn",
        "@typescript-eslint/no-this-alias": "warn",
        // Off deliberately. Every remaining hit is one of two correct patterns:
        // fetch-on-mount (auth check, feed, dashboards: state is set when the
        // request settles), or reading browser-only state — localStorage,
        // sessionStorage, matchMedia — which must happen after mount or the
        // server and client render different HTML and hydration fails.
        // Derived state that genuinely belonged in render (the Explore filter)
        // was moved to useMemo instead of being silenced here.
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/purity": "warn",
        "react-hooks/immutability": "warn",
        // Every <img> left in src/ renders a user upload, a data: URI (vetting
        // documents) or a blob: preview. next/image cannot optimise data:/blob:
        // sources, and for uploads it throws at runtime on any host missing
        // from images.remotePatterns — a broken page is worse than an
        // unoptimised image. Feed images use loading="lazy" instead.
        "@next/next/no-img-element": "off",
    },
    ignores: [
        "node_modules/**",
        ".next/**",
        "out/**",
        "build/**",
        "ultimate-test-suite.js",
        "scripts/**",
        "coverage/**",
    ],
}]);
