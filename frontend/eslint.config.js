import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import configPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Last: turns off every rule that would fight `prettier --write`.
      configPrettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Switched off here rather than with inline eslint-disable comments on
    // purpose: React Compiler skips any component carrying an inline
    // react-hooks suppression, which would silently drop OrgListProvider's
    // auto-memoization and let its mount effect re-fire on every render.
    // Config-level rules are invisible to the compiler.
    files: ["src/context/OrgListProvider.tsx"],
    rules: {
      // Predates the compiler, which caches `load` for the component's
      // lifetime — so "wrap it in useCallback" is the redundancy we removed.
      "react-hooks/exhaustive-deps": "off",
      // `load` only calls setState after an await, never synchronously in the
      // effect body, so the cascading renders this guards against can't occur.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Same reasoning as OrgListProvider: load() only calls setState after an
    // await, never synchronously in the effect body, the cascading renders
    // this rule guards against can't occur.
    files: ["src/context/NotificationProvider.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // loadMembers is also handed to InvitationForm's onSent, so it has to live
    // in the component body rather than inside the effect. The compiler caches
    // it on org.id/is_personal/role, so listing it as a dependency does not
    // re-run the effect every render — but exhaustive-deps predates the
    // compiler and cannot see that. set-state-in-effect stays ON here: it
    // caught a real synchronous setPending, which is fixed rather than muted.
    files: ["src/components/OrgMembers/OrgMembers.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);
