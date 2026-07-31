"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Calculator, Delete, GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";

type WebCalculatorProps = {
  open: boolean;
  onClose: () => void;
};

const keys = ["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "back", "="];

function solve(expression: string) {
  const normalized = expression;
  if (!/^[\d+\-*/().\s]+$/.test(normalized)) throw new Error("Invalid expression");
  // The strict allow-list above keeps evaluation limited to calculator arithmetic.
  const value = Function(`"use strict"; return (${normalized})`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid result");
  return Number(value.toFixed(8)).toString();
}

export function WebCalculator({ open, onClose }: WebCalculatorProps) {
  const [expression, setExpression] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  if (!open) return null;

  function press(key: string) {
    if (key === "C") return setExpression("");
    if (key === "back") return setExpression((value) => value.slice(0, -1));
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

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (expanded) return;
    drag.current = { active: true, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || expanded) return;
    setPosition({
      x: drag.current.originX + event.clientX - drag.current.startX,
      y: drag.current.originY + event.clientY - drag.current.startY,
    });
  }

  return (
    <div className={expanded ? "fixed inset-0 z-[100] bg-white" : "fixed right-4 top-[76px] z-[100] w-[min(330px,calc(100vw-2rem))]"} style={expanded ? undefined : { transform: `translate(${position.x}px, ${position.y}px)` }} role="dialog" aria-modal="true" aria-label="Calculator">
      <section className={expanded ? "mx-auto flex h-full w-full max-w-md flex-col bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" : "rounded-[22px] border border-[#dfe3f5] bg-white p-4 shadow-2xl"}>
        <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current.active = false; }} onPointerCancel={() => { drag.current.active = false; }} className="mb-3 flex touch-none select-none items-center gap-2 text-[#111936]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eef2ff] text-[#11298f]"><Calculator size={19} /></span>
          <strong className="flex-1 text-sm">Calculator</strong>
          {!expanded && <GripHorizontal size={20} className="text-[#8a93aa]" aria-label="Drag calculator" />}
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setExpanded((value) => !value)} className="grid size-9 place-items-center rounded-xl bg-[#f5f6fb]" aria-label={expanded ? "Minimize calculator" : "Expand calculator"}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-[#f5f6fb]" aria-label="Close calculator"><X size={18} /></button>
        </div>
        <div className="mb-3 min-h-20 overflow-x-auto rounded-2xl bg-[#f3f6ff] px-4 py-3 text-right">
          <span className="block text-xs font-semibold text-[#69718a]">Expression</span>
          <strong className="mt-2 block whitespace-nowrap text-2xl text-[#111936]">{expression || "0"}</strong>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((key) => (
            <button key={key} type="button" onClick={() => press(key)} className={key === "=" ? "h-12 rounded-xl bg-[#11298f] text-lg font-extrabold text-white" : key === "C" ? "h-12 rounded-xl bg-[#fff0ee] text-lg font-extrabold text-[#ef4444]" : "h-12 rounded-xl bg-[#f5f6fb] text-lg font-extrabold text-[#111936] active:bg-[#e8ecfb]"}>
              {key === "back" ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
