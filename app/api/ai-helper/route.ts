import { NextResponse } from "next/server";
import { requestGeminiCompatible } from "@/lib/ai-gemini-client";
import { requestOpenAiCompatible, type AiChatMessage } from "@/lib/ai-openai-client";
import { getAiProviderConfig } from "@/lib/ai-provider-config";
import { requireAuthenticated } from "@/lib/firebase/admin-server";

function buildSystemPrompt(context?: string) {
  return `You are Daily Hisab AI Helper. Reply in the user's language, preferably concise Bangla. For questions about the user's spending, totals, categories, dates, or descriptions, answer strictly from the supplied local finance context and do not say that you cannot access it. If the requested period has no entries, clearly say the amount is zero. Give practical budgeting insights only and never claim to change transactions. Local finance context:\n${context || "No summary available."}`;
}

export async function POST(request: Request) {
  try {
    await requireAuthenticated(request);
  } catch {
    return NextResponse.json({ error: "Login or create an account to use Daily Hisab AI." }, { status: 401 });
  }
  let body: { messages?: AiChatMessage[]; context?: string };
  try {
    body = await request.json() as { messages?: AiChatMessage[]; context?: string };
  } catch {
    return NextResponse.json({ error: "Invalid AI request." }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((item) => item.content?.trim()).slice(-10);
  if (!messages.length) return NextResponse.json({ error: "Write a question first." }, { status: 400 });

  const config = getAiProviderConfig();
  if (!config.apiKey) return NextResponse.json({ error: `${config.name} API key is not configured.` }, { status: 503 });

  const systemPrompt = buildSystemPrompt(body.context);
  const result = config.format === "gemini"
    ? await requestGeminiCompatible(config, messages, systemPrompt)
    : await requestOpenAiCompatible(config, messages, systemPrompt);

  return result.reply
    ? NextResponse.json({ reply: result.reply })
    : NextResponse.json({ error: result.error || "AI Helper could not connect." }, { status: result.status });
}
