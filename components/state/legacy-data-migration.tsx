"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const LEGACY_ORIGIN = "https://daily-hisab-eta.vercel.app";
const PRIMARY_HOSTS = new Set(["dailyhisab.xyz", "www.dailyhisab.xyz"]);
const MESSAGE_TYPE = "daily-hisab:legacy-data";

type MigrationMessage = {
  type: typeof MESSAGE_TYPE;
  items: Record<string, string>;
};

export function LegacyDataMigration() {
  const { loading, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "waiting" | "done" | "error">("idle");

  useEffect(() => {
    if (loading || !user || !PRIMARY_HOSTS.has(window.location.hostname)) return;

    const entryKey = `daily-hisab.entries.v1.${user.id}`;
    const dismissedKey = `daily-hisab.legacy-migration-dismissed.${user.id}`;
    const hasEntries = Boolean(window.localStorage.getItem(entryKey));
    setVisible(!hasEntries && window.localStorage.getItem(dismissedKey) !== "1");
  }, [loading, user]);

  useEffect(() => {
    function receiveMigration(event: MessageEvent<MigrationMessage>) {
      if (event.origin !== LEGACY_ORIGIN || event.data?.type !== MESSAGE_TYPE || !event.data.items) return;

      try {
        const items = Object.entries(event.data.items);
        if (items.length === 0) {
          setStatus("error");
          return;
        }

        for (const [key, value] of items) {
          if (key.startsWith("daily-hisab.")) {
            window.localStorage.setItem(key, value);
          }
        }

        setStatus("done");
        setTimeout(() => window.location.assign("/"), 700);
      } catch {
        setStatus("error");
      }
    }

    window.addEventListener("message", receiveMigration);
    return () => window.removeEventListener("message", receiveMigration);
  }, []);

  if (!visible || !user) return null;

  function startMigration() {
    setStatus("waiting");
    const target = encodeURIComponent(window.location.origin);
    const popup = window.open(
      `${LEGACY_ORIGIN}/transfer-data?target=${target}`,
      "daily-hisab-data-transfer",
      "popup,width=520,height=680",
    );

    if (!popup) setStatus("error");
  }

  function dismiss() {
    if (!user) return;
    window.localStorage.setItem(`daily-hisab.legacy-migration-dismissed.${user.id}`, "1");
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[100] mx-auto max-w-md rounded-2xl border border-[#d9def5] bg-white p-4 shadow-2xl">
      <p className="text-sm font-extrabold text-[#111936]">পুরোনো খরচের হিসাব পাওয়া গেছে?</p>
      <p className="mt-1 text-xs leading-5 text-[#59627a]">
        আগের Vercel ঠিকানার data একবারে dailyhisab.xyz-এ নিয়ে আসুন।
      </p>
      {status === "error" && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          Transfer শুরু হয়নি। Browser popup অনুমতি দিয়ে আবার চেষ্টা করুন।
        </p>
      )}
      {status === "done" && <p className="mt-2 text-xs font-semibold text-green-600">Data আনা হয়েছে—পেজ refresh হচ্ছে…</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={startMigration}
          disabled={status === "waiting" || status === "done"}
          className="flex-1 rounded-xl bg-[#11298f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {status === "waiting" ? "পুরোনো site খুলছে…" : "পুরোনো data আনুন"}
        </button>
        <button type="button" onClick={dismiss} className="rounded-xl border border-[#d9def5] px-3 py-2 text-xs font-bold text-[#59627a]">
          পরে
        </button>
      </div>
    </div>
  );
}
