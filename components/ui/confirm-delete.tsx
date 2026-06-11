"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete entry",
}: Readonly<{ onConfirm: () => void; label?: string }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label}>
        <Trash2 className="text-[#EF4444]" size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#161421]/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#ece8ff] bg-white p-5 shadow-[0_22px_55px_rgba(47,35,110,0.18)]">
            <h2 className="text-lg font-bold">Delete entry?</h2>
            <p className="mt-2 text-sm text-[#746d86]">This action will remove the entry from your Daily Hisab list.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type="button"
                className="bg-[#EF4444] shadow-[0_10px_22px_rgba(239,68,68,0.24)] hover:bg-[#dc2626]"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
