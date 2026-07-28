"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { CheckCircle2, LoaderCircle, LockKeyhole, MailCheck, XCircle } from "lucide-react";

import { firebaseAuth } from "@/lib/firebase/client";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "verifyAndChangeEmail" | "";

export default function FirebaseEmailActionPage() {
  const [mode, setMode] = useState<ActionMode>("");
  const [oobCode, setOobCode] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [message, setMessage] = useState("Checking your secure Daily Hisab link…");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = (params.get("mode") ?? "") as ActionMode;
    const nextCode = params.get("oobCode") ?? "";
    setMode(nextMode);
    setOobCode(nextCode);

    if (!firebaseAuth || !nextCode) {
      setStatus("error");
      setMessage("This verification link is invalid or incomplete.");
      return;
    }

    if (nextMode === "resetPassword") {
      void verifyPasswordResetCode(firebaseAuth, nextCode)
        .then((accountEmail) => {
          setEmail(accountEmail);
          setStatus("ready");
          setMessage("Create a new password for your Daily Hisab account.");
        })
        .catch(() => {
          setStatus("error");
          setMessage("This password reset link is invalid or has expired.");
        });
      return;
    }

    if (nextMode === "verifyEmail" || nextMode === "recoverEmail" || nextMode === "verifyAndChangeEmail") {
      void checkActionCode(firebaseAuth, nextCode)
        .then(() => applyActionCode(firebaseAuth!, nextCode))
        .then(() => {
          setStatus("success");
          setMessage(
            nextMode === "verifyEmail"
              ? "Your email is verified. Return to the Daily Hisab app and tap “I’ve verified — continue”."
              : "Your account email change has been confirmed."
          );
        })
        .catch(() => {
          setStatus("error");
          setMessage("This link is invalid, expired, or has already been used.");
        });
      return;
    }

    setStatus("error");
    setMessage("This Daily Hisab email action is not supported.");
  }, []);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseAuth || !oobCode) return;
    if (newPassword.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("The two passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("Updating your password…");
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
      setStatus("success");
      setMessage("Your password has been changed successfully. You can now log in.");
    } catch {
      setStatus("error");
      setMessage("This password reset link is invalid or has expired.");
    }
  }

  const isResetForm = mode === "resetPassword" && status === "ready";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f3f5ff] to-white px-5 py-12">
      <section className="w-full max-w-md rounded-[28px] border border-[#e5e7f2] bg-white p-7 text-center shadow-xl shadow-[#11298f]/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#11298f] text-white">
          {status === "loading" ? (
            <LoaderCircle className="animate-spin" size={32} />
          ) : status === "success" ? (
            <CheckCircle2 size={34} />
          ) : status === "error" ? (
            <XCircle size={34} />
          ) : mode === "resetPassword" ? (
            <LockKeyhole size={32} />
          ) : (
            <MailCheck size={32} />
          )}
        </div>

        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">Daily Hisab</p>
        <h1 className="mt-2 text-2xl font-black text-[#07194e]">
          {isResetForm ? "Set a new password" : status === "success" ? "All done!" : status === "error" ? "Link problem" : "Please wait"}
        </h1>
        <p className={`mt-3 text-sm leading-6 ${status === "error" ? "text-red-600" : "text-[#69718a]"}`}>{message}</p>

        {isResetForm && (
          <form className="mt-6 space-y-4 text-left" onSubmit={resetPassword}>
            {email && <p className="text-xs font-semibold text-[#69718a]">{email}</p>}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              className="h-12 w-full rounded-xl border border-[#d7daea] px-4 outline-none focus:border-[#11298f]"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="h-12 w-full rounded-xl border border-[#d7daea] px-4 outline-none focus:border-[#11298f]"
              required
            />
            <button className="h-12 w-full rounded-xl bg-[#11298f] font-extrabold text-white" type="submit">
              Save new password
            </button>
          </form>
        )}

        {!isResetForm && status !== "loading" && (
          <Link
            href="/login"
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#11298f] font-extrabold text-white"
          >
            Open Daily Hisab
          </Link>
        )}
      </section>
    </main>
  );
}
