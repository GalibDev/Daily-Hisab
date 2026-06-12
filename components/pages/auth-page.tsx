"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function AuthPage() {
  const router = useRouter();
  const { configured, signIn, signUp } = useAuth();
  const { notify } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      setLoading(true);
      if (mode === "login") {
        await signIn(email, password);
        notify("Login successful", "success");
      } else {
        await signUp(email, password);
        notify("Account created. Check email if confirmation is enabled.", "success");
      }
      router.push("/");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Authentication failed", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F8F7FF] px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#6C4CF1] text-white">
            <Wallet />
          </div>
          <h1 className="text-2xl font-bold">Daily Hisab</h1>
          <p className="text-sm text-[#746d86]">Supabase account দিয়ে হিসাব sync করুন</p>
        </div>
        {!configured && <div className="mb-4 rounded-lg bg-[#fff4e2] p-3 text-sm text-[#8a5a00]">Supabase env missing. `.env.local` check করুন।</div>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <input name="email" type="email" className={inputClass} placeholder="Email" required />
          <input name="password" type="password" className={inputClass} placeholder="Password" required minLength={6} />
          <Button type="submit" disabled={loading || !configured}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</Button>
        </form>
        <button type="button" className="mt-4 w-full text-sm font-semibold text-[#6C4CF1]" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New account create korun" : "Already account ache? Login"}
        </button>
      </Card>
    </main>
  );
}
