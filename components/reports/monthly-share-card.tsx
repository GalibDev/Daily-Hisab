"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useFinance } from "@/components/state/finance-store";
import { useLanguage } from "@/components/state/language-store";
import { Button } from "@/components/ui/button";
import { getTodayIso } from "@/lib/utils";

export function MonthlyShareCard() {
  const { entries } = useFinance();
  const { language } = useLanguage();
  const bn = language === "bangla";
  const [month, setMonth] = useState(() => getTodayIso().slice(0, 7));
  const [privateMode, setPrivateMode] = useState(true);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      await document.fonts.ready;
      if (cancelled || !canvas.current) return;
      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;
      const rows = entries.filter(e => e.date.slice(0, 7) === month && Number.isFinite(e.amount) && e.amount >= 0);
      const income = rows.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = rows.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const money = (value: number) => privateMode ? "••••" : `৳ ${value.toLocaleString(bn ? "bn-BD" : "en-US", { maximumFractionDigits: 2 })}`;
      const text = (value: string, x: number, y: number, size: number, color = "#ffffff") => {
        ctx.fillStyle = color;
        ctx.font = `600 ${size}px "Noto Sans Bengali", "Segoe UI", sans-serif`;
        ctx.fillText(value, x, y, 900);
      };
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      gradient.addColorStop(0, "#071b55"); gradient.addColorStop(1, "#174dc0");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#ffffff0c"; ctx.beginPath(); ctx.arc(1030, 100, 300, 0, Math.PI * 2); ctx.fill();
      text("Daily Hisab", 80, 115, 42);
      text(bn ? "আমার মাসের হিসাব" : "My monthly hisab", 80, 230, 60);
      text(new Date(`${month}-01T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-US", { month: "long", year: "numeric" }), 80, 292, 32, "#bfdbfe");
      [[bn ? "রেকর্ড করা আয়" : "Recorded income", income], [bn ? "রেকর্ড করা খরচ" : "Recorded expenses", expense], [bn ? "আয় − খরচ" : "Income − expenses", income - expense]].forEach(([label, amount], i) => {
        const y = 360 + i * 155;
        ctx.fillStyle = "#ffffff12"; ctx.beginPath(); ctx.roundRect(70, y, 940, 135, 24); ctx.fill();
        text(String(label), 105, y + 45, 28, "#bfdbfe");
        text(money(Number(amount)), 105, y + 105, 46);
      });
      text(rows.length ? (bn ? "নিজের হিসাব, নিজের নিয়ন্ত্রণে।" : "My money. My progress.") : (bn ? "এই মাসে কোনো রেকর্ড নেই" : "No records this month"), 80, 880, 32);
      text(privateMode ? (bn ? "ব্যক্তিগত পরিমাণ লুকানো আছে" : "Personal amounts hidden") : (bn ? "নিজের যোগ করা রেকর্ডের ভিত্তিতে" : "Based on self-recorded entries"), 80, 936, 23, "#bfdbfe");
      text("dailyhisab.xyz", 80, 1020, 38, "#ffbb72");
      canvas.current.toBlob(result => { if (!cancelled) setBlob(result); }, "image/png");
    };
    void draw().catch(() => { if (!cancelled) setMessage(bn ? "কার্ড তৈরি হয়নি। আবার চেষ্টা করুন।" : "Could not create card. Please retry."); });
    return () => { cancelled = true; };
  }, [entries, month, privateMode, bn]);

  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `daily-hisab-${month}.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share() {
    if (!blob) return;
    const file = new File([blob], `daily-hisab-${month}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Daily Hisab", text: "My monthly hisab · https://dailyhisab.xyz" });
      } else {
        download();
        setMessage(bn ? "ছবি ডাউনলোড হয়েছে। Facebook বা WhatsApp পোস্টে যোগ করুন।" : "Image downloaded. Attach it to your Facebook or WhatsApp post.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setMessage(bn ? "Share হয়নি। Download করে পোস্টে যোগ করুন।" : "Sharing failed. Download and attach the image instead.");
    }
  }
  return <section className="mx-auto grid max-w-2xl gap-5 rounded-2xl border border-slate-200 bg-white p-5">
    <h1 className="text-xl font-bold">{bn ? "মাসিক হিসাব শেয়ার করুন" : "Share your monthly hisab"}</h1>
    <label className="grid gap-2">{bn ? "মাস" : "Month"}<input type="month" value={month} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) { setBlob(null); setMonth(e.target.value); } }} className="rounded-lg border p-3" /></label>
    <label className="flex items-center gap-3"><input type="checkbox" checked={privateMode} onChange={e => { setBlob(null); setPrivateMode(e.target.checked); }} />{bn ? "টাকার পরিমাণ লুকিয়ে রাখুন" : "Hide monetary amounts"}</label>
    <p className="text-sm text-slate-500">{bn ? "নিচের ছবিটিই শেয়ার হবে। নাম, নোট বা লেনদেনের বিস্তারিত থাকবে না।" : "The image below is what you share. Names, notes and transaction details are excluded."}</p>
    <canvas ref={canvas} width={1080} height={1080} className="h-auto w-full rounded-2xl" aria-label={bn ? "মাসিক হিসাব কার্ডের প্রিভিউ" : "Monthly hisab card preview"} />
    <div className="flex flex-wrap gap-3"><Button disabled={!blob} onClick={download}><Download size={18} />{bn ? "PNG ডাউনলোড" : "Download PNG"}</Button><Button disabled={!blob} onClick={() => void share()}><Share2 size={18} />{bn ? "শেয়ার" : "Share"}</Button></div>
    <p role="status" className="text-sm">{message}</p>
  </section>;
}
