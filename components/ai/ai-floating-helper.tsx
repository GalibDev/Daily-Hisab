"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { AiLogo } from "@/components/ai/ai-logo";
import { useFinance } from "@/components/state/finance-store";
import { getTodayIso, takaShort } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

export function AiFloatingHelper() {
  const { entries } = useFinance();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "হ্যালো! খরচ বা বাজেট নিয়ে আমাকে প্রশ্ন করুন।" }]);
  const context = useMemo(() => {
    const month = getTodayIso().slice(0, 7);
    const expenses = entries.filter((item) => item.type === "expense");
    const monthTotal = expenses.filter((item) => item.date.startsWith(month)).reduce((sum, item) => sum + item.amount, 0);
    return `This month expense ${takaShort(monthTotal)}; all expense ${takaShort(expenses.reduce((sum, item) => sum + item.amount, 0))}.`;
  }, [entries]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setQuestion("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai-helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(1), context }) });
      const data = await response.json() as { reply?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.reply || data.error || "AI response পাওয়া যায়নি।" }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "AI Helper-এর সঙ্গে সংযোগ করা যায়নি।" }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Open AI Helper" className="ai-float-button fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-4 z-[60] rounded-[20px] bg-white p-1.5 shadow-[0_14px_36px_rgba(17,41,143,0.28)] ring-1 ring-[#dbe4ff] lg:bottom-6"><AiLogo /></button>;

  return (
    <section role="dialog" aria-label="Floating AI Helper" className="ai-chat-open fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-[60] flex h-[430px] w-[calc(100vw-1.5rem)] max-w-[360px] flex-col overflow-hidden rounded-[22px] border border-[#dbe4ff] bg-white shadow-[0_24px_64px_rgba(13,35,100,0.28)] lg:bottom-6 lg:right-6">
      <header className="flex items-center gap-3 bg-[linear-gradient(135deg,#0b246e,#315ddd)] px-4 py-3 text-white"><AiLogo compact /><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">Daily Hisab AI</h2><p className="text-[10px] font-semibold text-white/70">Smart expense helper</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close AI Helper" className="grid size-9 place-items-center rounded-full bg-white/10"><X size={18} /></button></header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-[#fbfcff] p-3">{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[84%] rounded-2xl rounded-br-md bg-[#11298f] px-3 py-2 text-xs leading-5 text-white" : "max-w-[84%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs leading-5 text-[#20263a] shadow-sm"}>{message.content}</p>)}{loading && <p className="text-xs font-semibold text-[#59627a]">AI ভাবছে…</p>}</div>
      <div className="border-t border-[#eef0f8] p-3"><form onSubmit={submit} className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Floating AI question" placeholder="প্রশ্ন করুন..." className="min-w-0 flex-1 rounded-xl border border-[#dfe3ef] px-3 text-sm outline-none focus:border-[#6c4cf1]" /><button type="submit" disabled={loading || !question.trim()} aria-label="Send floating AI question" className="grid size-11 place-items-center rounded-xl bg-[#6c4cf1] text-white disabled:opacity-50"><Send size={17} /></button></form><Link href="/ai-helper" className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-[#11298f]"><MessageCircle size={12} /> Open full AI Helper</Link></div>
    </section>
  );
}
