import { NextResponse } from "next/server";
import { answerDailyHisabHelp, DAILY_HISAB_APP_KNOWLEDGE } from "@/lib/ai-app-knowledge";
import { requestGeminiCompatible } from "@/lib/ai-gemini-client";
import { requestOpenAiCompatible, type AiChatMessage } from "@/lib/ai-openai-client";
import { getAiProviderConfig } from "@/lib/ai-provider-config";
import { requireAuthenticated } from "@/lib/firebase/admin-server";
import { AI_ATTACHMENT_MAX_BYTES, AI_ATTACHMENT_MAX_COUNT, type AiAttachment } from "@/lib/ai-attachments";

function buildSystemPrompt(context?: string) {
  return `You are Daily Hisab AI Helper. Reply in the user's language, preferably concise Bangla. Answer app usage questions from the verified product knowledge below and give the exact menu path when possible. For questions about the user's spending, totals, categories, dates, or descriptions, answer strictly from the supplied local finance context and do not say that you cannot access it. If the requested period has no entries, clearly say the amount is zero. Never claim to change transactions or settings.\n\nVerified Daily Hisab product knowledge:\n${DAILY_HISAB_APP_KNOWLEDGE}\n\nLocal finance context:\n${context || "No summary available."}`;
}

function sanitizeAttachments(input: unknown): AiAttachment[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, AI_ATTACHMENT_MAX_COUNT).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Partial<AiAttachment>;
    if (typeof value.name !== "string" || typeof value.mimeType !== "string" || typeof value.size !== "number") return [];
    if (value.size < 0 || value.size > AI_ATTACHMENT_MAX_BYTES) return [];
    const dataUrl = typeof value.dataUrl === "string" && value.dataUrl.startsWith("data:") && value.dataUrl.length < 7_500_000 ? value.dataUrl : undefined;
    const text = typeof value.text === "string" ? value.text.slice(0, 20_000) : undefined;
    if (!dataUrl && !text) return [];
    return [{ id: String(value.id || crypto.randomUUID()), name: value.name.slice(0, 160), mimeType: value.mimeType.slice(0, 100), size: value.size, dataUrl, text }];
  });
}

export async function POST(request: Request) {
  try {
    await requireAuthenticated(request);
  } catch {
    return NextResponse.json({ error: "Login or create an account to use Daily Hisab AI." }, { status: 401 });
  }
  let body: { messages?: AiChatMessage[]; context?: string; attachments?: AiAttachment[] };
  try {
    body = await request.json() as { messages?: AiChatMessage[]; context?: string; attachments?: AiAttachment[] };
  } catch {
    return NextResponse.json({ error: "Invalid AI request." }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((item) => item.content?.trim()).slice(-10);
  const attachments = sanitizeAttachments(body.attachments);
  if (!messages.length) return NextResponse.json({ error: "Write a question first." }, { status: 400 });

  const localHelpAnswer = answerDailyHisabHelp(messages[messages.length - 1].content);
  if (localHelpAnswer && !attachments.length) return NextResponse.json({ reply: localHelpAnswer, source: "app-knowledge" });

  const config = getAiProviderConfig();
  if (!config.apiKey) return NextResponse.json({ error: `${config.name} API key is not configured.` }, { status: 503 });

  const systemPrompt = buildSystemPrompt(body.context);
  const result = config.format === "gemini"
    ? await requestGeminiCompatible(config, messages, systemPrompt, attachments)
    : await requestOpenAiCompatible(config, messages, systemPrompt, attachments);

  return result.reply
    ? NextResponse.json({ reply: result.reply })
    : NextResponse.json({ error: result.error || "AI Helper could not connect." }, { status: result.status });
}
