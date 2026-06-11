import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
}: Readonly<{ label: string; children: React.ReactNode; className?: string }>) {
  return (
    <label className={cn("grid gap-2 text-sm font-semibold text-[#2b273d]", className)}>
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "h-12 rounded-lg border border-[#e7e2fb] bg-white px-4 text-sm text-[#252139] outline-none transition placeholder:text-[#a6a0bd] focus:border-[#6C4CF1] focus:ring-4 focus:ring-[#6C4CF1]/10";

export const textareaClass =
  "min-h-24 rounded-lg border border-[#e7e2fb] bg-white px-4 py-3 text-sm text-[#252139] outline-none transition placeholder:text-[#a6a0bd] focus:border-[#6C4CF1] focus:ring-4 focus:ring-[#6C4CF1]/10";
