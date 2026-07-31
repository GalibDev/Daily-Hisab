"use client";

import { useState } from "react";
import { Calculator, Delete, Maximize2, X } from "lucide-react";

type WebCalculatorProps = {
  open: boolean;
  onClose: () => void;
};

const keys = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "⌫", "="];

function solve(expression: string) {
  const normalized = expression.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-");
  if (!/^[\d+\-*/().\s]+$/.test(normalized)) throw new Error("Invalid expression");
  // The strict allow-list above keeps evaluation limited to calculator arithmetic.
  const value = Function(`"use strict"; return (${normalized})`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid result");
  return Number(value.toFixed(8)).toString();
}

export function WebCalculator({ open, onClose }: WebCalculatorProps) {
  const [expression, setExpression] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (!open) return null;

  function press(key: string) {
    if (key === "C") return setExpression("");
    if (key === "⌫") return setExpression((value) => value.slice(0, -1));
    if (key === "=") {
      try {
        setExpression((value) => solve(value || "0"));
      } catch {
        setExpression("Error");
      }
      return;
    }
    setExpression((value) => (value === "Error" ? key : `${value}${key}`));
  }

  return (
    <div className={expanded ? "fixed inset-0 z-[100] grid place-items-center bg-[#0b1024]/45 p-5 backdrop-blur-sm" : "fixed right-4 top-[76px] z-[100] w-[min(330px,calc(100vw-2rem))]"} role="dialog" aria-modal="true" aria-label="Calculator">
      <section className={expanded ? "w-full max-w-sm rounded-[26px] border border-white/20 bg-white p-5 shadow-2xl" : "rounded-[22px] border border-[#dfe3f5] bg-white p-4 shadow-2xl"}>
        <div className="mb-3 flex items-center gap-2 text-[#111936]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eef2ff] text-[#11298f]"><Calculator size={19} /></span>
          <strong className="flex-1 text-sm">Calculator</strong>
          <button type="button" onClick={() => setExpanded((value) => !value)} className="grid size-9 place-items-center rounded-xl bg-[#f5f6fb]" aria-label={expanded ? "Minimize calculator" : "Expand calculator"}><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-[#f5f6fb]" aria-label="Close calculator"><X size={18} /></button>
        </div>
        <div className="mb-3 min-h-20 overflow-x-auto rounded-2xl bg-[#f3f6ff] px-4 py-3 text-right">
          <span className="block text-xs font-semibold text-[#69718a]">Expression</span>
          <strong className="mt-2 block whitespace-nowrap text-2xl text-[#111936]">{expression || "0"}</strong>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((key) => (
            <button key={key} type="button" onClick={() => press(key)} className={key === "=" ? "h-12 rounded-xl bg-[#11298f] text-lg font-extrabold text-white" : key === "C" ? "h-12 rounded-xl bg-[#fff0ee] text-lg font-extrabold text-[#ef4444]" : "h-12 rounded-xl bg-[#f5f6fb] text-lg font-extrabold text-[#111936] active:bg-[#e8ecfb]"}>
              {key === "⌫" ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
