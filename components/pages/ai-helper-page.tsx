"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Paperclip, Send, User } from "lucide-react";
import { AiAttachmentList } from "@/components/ai/ai-attachment-list";
import { AiLogo } from "@/components/ai/ai-logo";
import { AiMessageContent } from "@/components/ai/ai-message-content";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildAiFinanceContext } from "@/lib/ai-finance-context";
import { AI_ATTACHMENT_ACCEPT, AI_ATTACHMENT_MAX_COUNT, createAiAttachment, type AiAttachment } from "@/lib/ai-attachments";

type Message = { role: "user" | "assistant"; content: string; attachments?: AiAttachment[] };

export function AiHelperPage() {
  const { getIdToken, loading: authLoading, user } = useAuth();
  const { entries } = useFinance();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "আসসালামু আলাইকুম! আপনার খরচ, বাজেট বা সঞ্চয় নিয়ে কী জানতে চান?" }]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const context = useMemo(() => buildAiFinanceContext(entries), [entries]);

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    setAttachmentError("");
    try {
      const available = Math.max(0, AI_ATTACHMENT_MAX_COUNT - attachments.length);
      const next = await Promise.all(Array.from(files).slice(0, available).map(createAiAttachment));
      setAttachments((current) => [...current, ...next]);
      if (files.length > available) setAttachmentError(`একসাথে সর্বোচ্চ ${AI_ATTACHMENT_MAX_COUNT}টি file যোগ করা যাবে।`);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "File যোগ করা যায়নি।");
    } finally {
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    setAttachmentError("");
  }

  async function askAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim() || (attachments.length ? "সংযুক্ত file বিশ্লেষণ করুন।" : "");
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content, attachments: sentAttachments }];
    const sentAttachments = attachments;
    setMessages(nextMessages);
    setQuestion("");
    setAttachments([]);
    setLoading(true);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/ai-helper", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: nextMessages.slice(1), context, attachments: sentAttachments }) });
      const data = await response.json() as { reply?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.reply || data.error || "AI response পাওয়া যায়নি।" }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "AI Helper-এর সঙ্গে সংযোগ করা যায়নি।" }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ["এই মাসে কোথায় বেশি খরচ হয়েছে?", "কীভাবে খরচ কমাতে পারি?", "আমার জন্য ছোট বাজেট বানাও"];

  if (!authLoading && !user) return <AppShell><div className="mx-auto grid min-h-[65dvh] max-w-xl place-items-center"><Card className="w-full overflow-hidden rounded-[26px] border-[#dce5ff] p-0 text-center shadow-[0_22px_55px_rgba(17,41,143,0.14)]"><div className="bg-gradient-to-br from-[#071b75] via-[#11298f] to-[#315ddd] p-7 text-white"><AiLogo /><h1 className="mt-5 text-2xl font-black">Login to use Daily Hisab AI</h1><p className="mt-2 text-sm font-semibold leading-6 text-white/76">Create a free account to receive secure, personalized insights based on your own expense data.</p></div><div className="grid gap-3 p-5"><Link href="/login" className="rounded-2xl bg-[#11298f] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg">Login or Create Account</Link><p className="text-xs font-semibold text-[#69718a]">Your AI requests are protected with your signed-in account.</p></div></Card></div></AppShell>;

  return (
    <AppShell>
      <div className="grid min-h-[calc(100dvh-12rem)] gap-4 pb-3">
        <section className="rounded-[22px] bg-[linear-gradient(135deg,#081c5c,#315ddd)] p-5 text-white shadow-[0_18px_38px_rgba(17,41,143,0.22)]">
          <div className="flex items-center gap-3"><AiLogo /><div><h1 className="text-xl font-extrabold">Daily Hisab AI</h1><p className="text-xs font-semibold text-white/75">আপনার খরচ বুঝে সহজ পরামর্শ</p></div></div>
        </section>
        <Card className="flex min-h-[420px] flex-col overflow-hidden rounded-[20px] border-[#e7eaf3]">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role === "assistant" && <AiLogo compact />}<p className={message.role === "user" ? "max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#11298f] px-4 py-3 text-sm leading-6 text-white" : "max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[#f3f5fb] px-4 py-3 text-sm leading-6 text-[#20263a]"}><AiMessageContent content={message.content} /></p>{message.role === "user" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f3f1ff] text-[#6c4cf1]"><User size={16} /></span>}</div>)}
            {loading && <p className="text-sm font-semibold text-[#59627a]">AI ভাবছে…</p>}
          </div>
          <div className="border-t border-[#eef0f8] p-3">
            <input ref={attachmentInputRef} type="file" accept={AI_ATTACHMENT_ACCEPT} multiple className="hidden" onChange={(event) => void addAttachments(event.target.files)} />
            <AiAttachmentList attachments={attachments} onRemove={removeAttachment} />
            {attachments.length > 0 && <p className="mb-2 text-[11px] font-semibold text-[#69718a]">শুধু AI analysis-এর জন্য পাঠানো হবে; Daily Hisab storage-এ save হবে না।</p>}
            {attachmentError && <p className="mb-2 text-xs font-bold text-[#dc2626]">{attachmentError}</p>}
            <div className="mb-3 flex gap-2 overflow-x-auto">{suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="shrink-0 rounded-full border border-[#dbe4ff] bg-[#f7f9ff] px-3 py-2 text-[11px] font-bold text-[#11298f]">{item}</button>)}</div>
            <form onSubmit={askAi} className="flex gap-2">
              <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={loading || attachments.length >= AI_ATTACHMENT_MAX_COUNT} aria-label="Attach image or file" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#dfe3ef] text-[#59627a] disabled:opacity-40"><Paperclip size={18} /></button>
              <input value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#dfe3ef] px-4 text-sm outline-none focus:border-[#6c4cf1]" placeholder="AI-কে প্রশ্ন করুন..." aria-label="Ask AI" />
              <Button type="submit" disabled={loading || (!question.trim() && !attachments.length)} aria-label="Send question"><Send size={18} /></Button>
            </form>
          </div>
        </Card>
        <Link href="/settings" className="text-center text-xs font-extrabold text-[#11298f]">Back to Profile</Link>
      </div>
    </AppShell>
  );
}
