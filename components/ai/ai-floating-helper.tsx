"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Paperclip, Send, X } from "lucide-react";
import { AiAttachmentList } from "@/components/ai/ai-attachment-list";
import { AiLogo } from "@/components/ai/ai-logo";
import { AiMessageContent } from "@/components/ai/ai-message-content";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import { buildAiFinanceContext } from "@/lib/ai-finance-context";
import { AI_ATTACHMENT_ACCEPT, AI_ATTACHMENT_MAX_COUNT, createAiAttachment, type AiAttachment } from "@/lib/ai-attachments";

type Message = { role: "user" | "assistant"; content: string };

export function AiFloatingHelper() {
  const { getIdToken, user } = useAuth();
  const { entries } = useFinance();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "হ্যালো! খরচ বা বাজেট নিয়ে আমাকে প্রশ্ন করুন।" }]);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim() || (attachments.length ? "সংযুক্ত file বিশ্লেষণ করুন।" : "");
    if (!content || loading) return;
    const sentAttachments = attachments;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setQuestion("");
    setAttachments([]);
    setLoading(true);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/ai-helper", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: next.slice(1), context, attachments: sentAttachments }) });
      const data = await response.json() as { reply?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.reply || data.error || "AI response পাওয়া যায়নি।" }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "AI Helper-এর সঙ্গে সংযোগ করা যায়নি।" }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Open AI Helper" className="ai-float-button fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-4 z-[60] rounded-[20px] bg-white p-1.5 shadow-[0_14px_36px_rgba(17,41,143,0.28)] ring-1 ring-[#dbe4ff] lg:bottom-6"><AiLogo /></button>;

  if (!user) return <section role="dialog" aria-label="AI account required" className="ai-chat-open fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-[60] w-[calc(100vw-1.5rem)] max-w-[360px] overflow-hidden rounded-[22px] border border-[#dbe4ff] bg-white shadow-[0_24px_64px_rgba(13,35,100,0.28)] lg:bottom-6 lg:right-6"><header className="flex items-center gap-3 bg-[linear-gradient(135deg,#0b246e,#315ddd)] px-4 py-3 text-white"><AiLogo compact /><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">Daily Hisab AI</h2><p className="text-[10px] font-semibold text-white/70">Account-only secure feature</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close AI Helper" className="grid size-9 place-items-center rounded-full bg-white/10"><X size={18} /></button></header><div className="p-6 text-center"><h3 className="text-lg font-extrabold text-[#111936]">Login required</h3><p className="mt-2 text-xs font-semibold leading-5 text-[#69718a]">Login or create a free account to use personalized AI insights.</p><Link href="/login" onClick={() => setOpen(false)} className="mt-5 block rounded-xl bg-[#11298f] px-4 py-3 text-sm font-extrabold text-white">Login or Create Account</Link></div></section>;

  return (
    <section role="dialog" aria-label="Floating AI Helper" className="ai-chat-open fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-[60] flex h-[430px] w-[calc(100vw-1.5rem)] max-w-[360px] flex-col overflow-hidden rounded-[22px] border border-[#dbe4ff] bg-white shadow-[0_24px_64px_rgba(13,35,100,0.28)] lg:bottom-6 lg:right-6">
      <header className="flex items-center gap-3 bg-[linear-gradient(135deg,#0b246e,#315ddd)] px-4 py-3 text-white"><AiLogo compact /><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">Daily Hisab AI</h2><p className="text-[10px] font-semibold text-white/70">Smart expense helper</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close AI Helper" className="grid size-9 place-items-center rounded-full bg-white/10"><X size={18} /></button></header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-[#fbfcff] p-3">{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#11298f] px-3 py-2 text-xs leading-5 text-white" : "max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs leading-5 text-[#20263a] shadow-sm"}><AiMessageContent content={message.content} /></p>)}{loading && <p className="text-xs font-semibold text-[#59627a]">AI ভাবছে…</p>}</div>
      <div className="border-t border-[#eef0f8] p-3"><form onSubmit={submit} className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Floating AI question" placeholder="প্রশ্ন করুন..." className="min-w-0 flex-1 rounded-xl border border-[#dfe3ef] px-3 text-sm outline-none focus:border-[#6c4cf1]" /><button type="submit" disabled={loading || !question.trim()} aria-label="Send floating AI question" className="grid size-11 place-items-center rounded-xl bg-[#6c4cf1] text-white disabled:opacity-50"><Send size={17} /></button></form><Link href="/ai-helper" className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-[#11298f]"><MessageCircle size={12} /> Open full AI Helper</Link></div>
    </section>
  );
}
