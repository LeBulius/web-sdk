import type { LinguiConfig } from "@lingui/conf";

export const locales = [
  "ar",
  "da",
  "de",
  "en",
  "es",
  "fi",
  "fr",
  "hi",
  "id",
  "ja",
  "ko",
  "pl",
  "pt",
  "ru",
  "tr",
  "vi",
  "zh",
] as const;

const config: LinguiConfig = {
  fallbackLocales: {
    default: "en",
  },
  "sourceLocale": "en",
  // @ts-ignore string[]
  locales,
};

export default config;
