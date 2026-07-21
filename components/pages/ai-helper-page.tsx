"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTodayIso, takaShort } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

export function AiHelperPage() {
  const { entries } = useFinance();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "আসসালামু আলাইকুম! আপনার খরচ, বাজেট বা সঞ্চয় নিয়ে কী জানতে চান?" }]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const monthPrefix = getTodayIso().slice(0, 7);
  const context = useMemo(() => {
    const expenses = entries.filter((item) => item.type === "expense");
    const monthExpenses = expenses.filter((item) => item.date.startsWith(monthPrefix));
    const monthTotal = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = monthExpenses.reduce<Record<string, number>>((totals, item) => ({ ...totals, [item.category]: (totals[item.category] ?? 0) + item.amount }), {});
    return `This month expense ${takaShort(monthTotal)}. All expense ${takaShort(expenses.reduce((sum, item) => sum + item.amount, 0))}. Category totals: ${Object.entries(categoryTotals).map(([name, amount]) => `${name} ${takaShort(amount)}`).join(", ") || "none"}.`;
  }, [entries, monthPrefix]);

  async function askAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai-helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages.slice(1), context }) });
      const data = await response.json() as { reply?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.reply || data.error || "AI response পাওয়া যায়নি।" }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "AI Helper-এর সঙ্গে সংযোগ করা যায়নি।" }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ["এই মাসে কোথায় বেশি খরচ হয়েছে?", "কীভাবে খরচ কমাতে পারি?", "আমার জন্য ছোট বাজেট বানাও"];

  return (
    <AppShell>
      <div className="grid min-h-[calc(100dvh-12rem)] gap-4 pb-3">
        <section className="rounded-[22px] bg-[linear-gradient(135deg,#081c5c,#315ddd)] p-5 text-white shadow-[0_18px_38px_rgba(17,41,143,0.22)]">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Sparkles size={24} /></span><div><h1 className="text-xl font-extrabold">Daily Hisab AI</h1><p className="text-xs font-semibold text-white/75">আপনার খরচ বুঝে সহজ পরামর্শ</p></div></div>
        </section>
        <Card className="flex min-h-[420px] flex-col overflow-hidden rounded-[20px] border-[#e7eaf3]">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role === "assistant" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eef4ff] text-[#11298f]"><Bot size={17} /></span>}<p className={message.role === "user" ? "max-w-[82%] rounded-2xl rounded-br-md bg-[#11298f] px-4 py-3 text-sm leading-6 text-white" : "max-w-[82%] rounded-2xl rounded-bl-md bg-[#f3f5fb] px-4 py-3 text-sm leading-6 text-[#20263a]"}>{message.content}</p>{message.role === "user" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f3f1ff] text-[#6c4cf1]"><User size={16} /></span>}</div>)}
            {loading && <p className="text-sm font-semibold text-[#59627a]">AI ভাবছে…</p>}
          </div>
          <div className="border-t border-[#eef0f8] p-3"><div className="mb-3 flex gap-2 overflow-x-auto">{suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="shrink-0 rounded-full border border-[#dbe4ff] bg-[#f7f9ff] px-3 py-2 text-[11px] font-bold text-[#11298f]">{item}</button>)}</div><form onSubmit={askAi} className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#dfe3ef] px-4 text-sm outline-none focus:border-[#6c4cf1]" placeholder="AI-কে প্রশ্ন করুন..." aria-label="Ask AI" /><Button type="submit" disabled={loading || !question.trim()} aria-label="Send question"><Send size={18} /></Button></form></div>
        </Card>
        <Link href="/settings" className="text-center text-xs font-extrabold text-[#11298f]">Back to Profile</Link>
      </div>
    </AppShell>
  );
}
