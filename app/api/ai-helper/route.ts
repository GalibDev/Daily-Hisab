import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/firebase/admin-server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function buildSystemPrompt(context?: string) {
  return `You are Daily Hisab AI Helper. Reply in the user's language, preferably concise Bangla. For questions about the user's spending, totals, categories, dates, or descriptions, answer strictly from the supplied local finance context and do not say that you cannot access it. If the requested period has no entries, clearly say the amount is zero. Give practical budgeting insights only and never claim to change transactions. Local finance context:\n${context || "No summary available."}`;
}

async function requestGemini(messages: ChatMessage[], context?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = (process.env.GOOGLE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });

  const response = await fetch(`${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(context) }] },
      contents: messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { temperature: 0.4 },
    }),
    cache: "no-store",
  });
  const raw = await response.text();
  let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } } = {};
  try { data = JSON.parse(raw); } catch { /* Return a clean provider error below. */ }

  if (!response.ok) return NextResponse.json({ error: data.error?.message || raw || "Gemini provider request failed." }, { status: response.status });
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  return reply
    ? NextResponse.json({ reply })
    : NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
}

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
  try {
    await requireAuthenticated(request);
  } catch {
    return NextResponse.json({ error: "Login or create an account to use Daily Hisab AI." }, { status: 401 });
  }
  let body: { messages?: ChatMessage[]; context?: string };
  try {
    body = await request.json() as { messages?: ChatMessage[]; context?: string };
  } catch {
    return NextResponse.json({ error: "Invalid AI request." }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((item) => item.content?.trim()).slice(-10);
  if (!messages.length) return NextResponse.json({ error: "Write a question first." }, { status: 400 });

  const provider = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "walkai");
  if (provider === "gemini") {
    try {
      return await requestGemini(messages, body.context);
    } catch {
      return NextResponse.json({ error: "Gemini could not connect. Check base URL, model and API key." }, { status: 502 });
    }
  }

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
              { role: "system", content: buildSystemPrompt(body.context) },
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
        if (/not supported by any configured account/i.test(lastError)) {
          return NextResponse.json({ error: "This WalkAI key group is not a chat group. Select a text/chat Gemini group for this API key." }, { status: 422 });
        }
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
