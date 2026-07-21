import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

async function resolveWalkModel(baseUrl: string, apiKey: string, configuredModel: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!response.ok) return configuredModel;
    const data = await response.json() as { data?: Array<{ id?: string }> };
    const models = (data.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
    if (models.includes(configuredModel)) return configuredModel;
    return models.find((id) => !/(image|embedding|moderation|audio)/i.test(id)) || configuredModel;
  } catch {
    return configuredModel;
  }
}

function normalizeBaseUrl(value: string) {
  const url = value.replace(/\/$/, "");
  return /\/v1$/i.test(url) ? url : `${url}/v1`;
}

export async function POST(request: Request) {
  const provider = process.env.AI_PROVIDER || "walkai";
  const apiKey = process.env.WALKAI_API_KEY;
  const baseUrls = Array.from(new Set([
    normalizeBaseUrl(process.env.WALKAI_BASE_URL || "https://walkai.top/v1"),
    normalizeBaseUrl(process.env.WALKAI_FALLBACK_BASE_URL || "https://walkcoding.top/v1"),
  ]));
  const model = process.env.WALKAI_MODEL || "gemini-2.5-flash";

  if (provider !== "walkai") {
    return NextResponse.json({ error: `Unsupported AI provider: ${provider}` }, { status: 503 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "WALKAI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const body = await request.json() as { messages?: ChatMessage[]; context?: string };
    const messages = (body.messages ?? []).filter((item) => item.content?.trim()).slice(-10);
    if (!messages.length) return NextResponse.json({ error: "Write a question first." }, { status: 400 });
    let lastError = "AI provider request failed.";
    let lastStatus = 502;

    for (const baseUrl of baseUrls) {
      try {
        const activeModel = await resolveWalkModel(baseUrl, apiKey, model);
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: activeModel,
            temperature: 0.4,
            messages: [
              { role: "system", content: `You are Daily Hisab AI Helper. Reply in the user's language, preferably concise Bangla. Give practical budgeting and expense insights only; never claim to change transactions. Current local summary: ${body.context || "No summary available."}` },
              ...messages,
            ],
          }),
          cache: "no-store",
        });

        const raw = await response.text();
        let data: { reply?: string; message?: string; response?: string; output?: string; choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string } = {};
        try { data = JSON.parse(raw); } catch { /* Keep provider text below. */ }

        if (response.ok) {
          const reply = (data.reply || data.message || data.response || data.output || data.choices?.[0]?.message?.content)?.trim();
          if (reply) return NextResponse.json({ reply });
          lastError = "AI returned an empty response.";
          lastStatus = 502;
          continue;
        }

        lastError = (typeof data.error === "string" ? data.error : data.error?.message) || data.message || raw || "AI provider request failed.";
        lastStatus = response.status;
        const retryable = /no available accounts/i.test(lastError) || [429, 502, 503, 504].includes(response.status);
        if (!retryable) break;
      } catch {
        // Try the next configured WalkAI endpoint without hiding the primary error.
      }
    }

    return NextResponse.json({ error: lastError }, { status: lastStatus });
  } catch {
    return NextResponse.json({ error: "AI Helper could not connect. Check endpoint, model and API key." }, { status: 500 });
  }
}
