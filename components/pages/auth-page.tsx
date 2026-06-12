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
  const { configured, signIn, signInWithGoogle, signUp } = useAuth();
  const { notify } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(form.get("name") || "");

    try {
      setLoading(true);
      if (mode === "login") {
        await signIn(email, password);
        notify("Login successful", "success");
      } else {
        await signUp(email, password, name);
        notify("Account created successfully", "success");
      }
      router.push("/");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Authentication failed", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      await signInWithGoogle();
      notify("Google sign-in successful", "success");
      router.push("/");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Google sign-in failed", "danger");
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
          <p className="text-sm text-[#746d86]">Firebase account দিয়ে login করুন</p>
        </div>
        {!configured && <div className="mb-4 rounded-lg bg-[#fff4e2] p-3 text-sm text-[#8a5a00]">Firebase env missing. `.env.local` check করুন।</div>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          {mode === "signup" && <input name="name" className={inputClass} placeholder="Full name" />}
          <input name="email" type="email" className={inputClass} placeholder="Email" required />
          <input name="password" type="password" className={inputClass} placeholder="Password" required minLength={6} />
          <Button type="submit" disabled={loading || !configured}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs font-semibold text-[#9a93ac]">
          <span className="h-px flex-1 bg-[#ece8ff]" /> OR <span className="h-px flex-1 bg-[#ece8ff]" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={loading || !configured} onClick={handleGoogleSignIn}>
          <span className="grid size-5 place-items-center rounded-full bg-white text-sm font-bold text-[#4285F4]">G</span>
          Continue with Google
        </Button>
        <button type="button" className="mt-4 w-full text-sm font-semibold text-[#6C4CF1]" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New account create korun" : "Already account ache? Login"}
        </button>
      </Card>
    </main>
  );
}
