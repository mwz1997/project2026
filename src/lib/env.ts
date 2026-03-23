const getEnv = (name: string) => process.env[name]?.trim();

export const env = {
  databaseUrl: getEnv("DATABASE_URL") ?? "",
  openAiApiKey: getEnv("OPENAI_API_KEY") ?? "",
  openAiModel: getEnv("OPENAI_MODEL") || "gpt-4.1-mini",
  appBaseUrl: getEnv("APP_BASE_URL") || "http://localhost:3000",
  cronSecret: getEnv("CRON_SECRET") || "",
};

export const flags = {
  hasDatabase: Boolean(env.databaseUrl),
  hasOpenAI: Boolean(env.openAiApiKey),
};
