import type { AiProviderConfig } from "@/lib/ai-provider-config";
import type { AiChatMessage, AiProviderResult } from "@/lib/ai-openai-client";

export async function requestGeminiCompatible(config: AiProviderConfig, messages: AiChatMessage[], systemPrompt: string): Promise<AiProviderResult> {
  const baseUrl = config.baseUrls[0];
  const apiRoot = /\/v1beta$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1beta`;
  const model = config.model || "gemini-2.0-flash";

  try {
    const response = await fetch(`${apiRoot}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { temperature: 0.4 },
      }),
      cache: "no-store",
    });
    const raw = await response.text();
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } } = {};
    try { data = JSON.parse(raw); } catch { /* Preserve provider text as an error. */ }

    if (!response.ok) return { error: data.error?.message || raw || "Gemini provider request failed.", status: response.status };
    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    return reply
      ? { reply, status: 200 }
      : { error: "Gemini returned an empty response.", status: 502 };
  } catch {
    return { error: "Gemini-compatible endpoint could not connect.", status: 502 };
  }
}
