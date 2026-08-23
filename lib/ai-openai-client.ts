import type { AiProviderConfig } from "@/lib/ai-provider-config";

export type AiChatMessage = { role: "user" | "assistant"; content: string };
export type AiProviderResult = { reply?: string; error?: string; status: number };

async function resolveChatModel(baseUrl: string, apiKey: string, configuredModel: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) return configuredModel;
    const data = await response.json() as { data?: Array<{ id?: string }> };
    const models = (data.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
    if (configuredModel && models.includes(configuredModel)) return configuredModel;
    return models.find((id) => !/(image|embedding|moderation|audio|tts)/i.test(id)) || configuredModel;
  } catch {
    return configuredModel;
  }
}

export async function requestOpenAiCompatible(config: AiProviderConfig, messages: AiChatMessage[], systemPrompt: string): Promise<AiProviderResult> {
  let lastError = "AI provider request failed.";
  let lastStatus = 502;

  for (const baseUrl of config.baseUrls) {
    try {
      const model = await resolveChatModel(baseUrl, config.apiKey, config.model);
      if (!model) {
        lastError = "No text/chat model is available for this API key.";
        lastStatus = 422;
        continue;
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
        cache: "no-store",
      });
      const raw = await response.text();
      let data: { reply?: string; message?: string; response?: string; output?: string; choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string } = {};
      try { data = JSON.parse(raw); } catch { /* Preserve provider text as an error. */ }

      if (response.ok) {
        const reply = (data.reply || data.message || data.response || data.output || data.choices?.[0]?.message?.content)?.trim();
        if (reply) return { reply, status: 200 };
        lastError = "AI returned an empty response.";
        lastStatus = 502;
        continue;
      }

      lastError = (typeof data.error === "string" ? data.error : data.error?.message) || data.message || raw || lastError;
      lastStatus = response.status;
      const retryable = /no available accounts/i.test(lastError) || [429, 502, 503, 504].includes(response.status);
      if (!retryable) break;
    } catch {
      // Continue to the next configured endpoint.
    }
  }

  return { error: lastError, status: lastStatus };
}
