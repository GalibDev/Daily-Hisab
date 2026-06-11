import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#ebe7ff] bg-white shadow-[0_10px_26px_rgba(47,35,110,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
