import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "out/**", "release/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        AbortSignal: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Response: "readonly",
        DOMException: "readonly",
        WebSocket: "readonly",
        AudioContext: "readonly",
        AudioWorkletNode: "readonly",
        GainNode: "readonly",
        MediaStream: "readonly",
        MediaStreamAudioSourceNode: "readonly",
        MessagePort: "readonly",
        MessageEvent: "readonly",
        AudioWorkletProcessor: "readonly",
        registerProcessor: "readonly",
        process: "readonly",
        __dirname: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }]
    }
  },
  prettier
];
