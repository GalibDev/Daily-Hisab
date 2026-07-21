import { BrainCircuit, Sparkles } from "lucide-react";

export function AiLogo({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-[linear-gradient(145deg,#7c3aed,#2563eb_55%,#06b6d4)] text-white shadow-[0_10px_24px_rgba(79,70,229,0.38)] ring-1 ring-white/35 ${compact ? "size-9" : "size-12"}`} aria-hidden="true">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,.45),transparent_34%)]" />
      <BrainCircuit className="relative" size={compact ? 20 : 27} strokeWidth={2.1} />
      <Sparkles className="absolute right-1 top-1 text-cyan-100" size={compact ? 9 : 12} fill="currentColor" />
    </span>
  );
}
