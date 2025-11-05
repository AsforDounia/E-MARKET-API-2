import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
    {
        ignores: [
            "node_modules/**",
            "coverage/**",
            ".nyc_output/**",
            "dist/**",
            "build/**",
            "uploads/**",
            "public/**",
            "docs/**",
            "logs/**",
        ],
    },
    {
        files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            "prefer-const": "warn",
            "no-constant-binary-expression": "error",
        },
    },
]);
