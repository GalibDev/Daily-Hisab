import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.WALKAI_API_KEY;
  const apiUrl = process.env.WALKAI_API_URL || "https://walkai.top/v1/chat/completions";
  const model = process.env.WALKAI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json({ error: "WALKAI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const body = await request.json() as { messages?: ChatMessage[]; context?: string };
    const messages = (body.messages ?? []).filter((item) => item.content?.trim()).slice(-10);
    if (!messages.length) return NextResponse.json({ error: "Write a question first." }, { status: 400 });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: `You are Daily Hisab AI Helper. Reply in the user's language, preferably concise Bangla. Give practical budgeting and expense insights only; never claim to change transactions. Current local summary: ${body.context || "No summary available."}` },
          ...messages,
        ],
      }),
      cache: "no-store",
    });

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string };
    if (!response.ok) {
      const providerError = typeof data.error === "string" ? data.error : data.error?.message;
      return NextResponse.json({ error: providerError || "AI provider request failed." }, { status: response.status });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "AI Helper could not connect. Check endpoint, model and API key." }, { status: 500 });
  }
}
