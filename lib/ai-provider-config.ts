export type AiApiFormat = "openai" | "gemini";

export type AiProviderConfig = {
  name: string;
  format: AiApiFormat;
  apiKey: string;
  model: string;
  baseUrls: string[];
};

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function openAiBaseUrl(value: string) {
  const url = cleanBaseUrl(value);
  return /\/v1$/i.test(url) ? url : `${url}/v1`;
}

export function getAiProviderConfig(): AiProviderConfig {
  const inferredProvider = process.env.GROK_API_KEY || process.env.GROK_MODELS_BASE_URL
    ? "grok"
    : process.env.GEMINI_API_KEY
      ? "gemini"
      : "walkai";
  const name = (process.env.AI_PROVIDER || inferredProvider).toLowerCase();
  const explicitFormat = process.env.AI_API_FORMAT?.toLowerCase();

  if (process.env.AI_API_KEY || process.env.AI_BASE_URL) {
    const format: AiApiFormat = explicitFormat === "gemini" ? "gemini" : "openai";
    return {
      name,
      format,
      apiKey: process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "",
      baseUrls: [format === "gemini"
        ? cleanBaseUrl(process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com")
        : openAiBaseUrl(process.env.AI_BASE_URL || "https://api.openai.com/v1")],
    };
  }

  if (name === "gemini") {
    return {
      name,
      format: "gemini",
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      baseUrls: [cleanBaseUrl(process.env.GOOGLE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com")],
    };
  }

  if (name === "grok") {
    return {
      name,
      format: "openai",
      apiKey: process.env.GROK_API_KEY || "",
      model: process.env.GROK_MODEL || "",
      baseUrls: [openAiBaseUrl(process.env.GROK_MODELS_BASE_URL || "https://api.x.ai/v1")],
    };
  }

  return {
    name,
    format: explicitFormat === "gemini" ? "gemini" : "openai",
    apiKey: process.env.WALKAI_API_KEY || "",
    model: process.env.WALKAI_MODEL || "",
    baseUrls: Array.from(new Set([
      openAiBaseUrl(process.env.WALKAI_BASE_URL || "https://walkai.top/v1"),
      openAiBaseUrl(process.env.WALKAI_FALLBACK_BASE_URL || "https://walkcoding.top/v1"),
    ])),
  };
}
