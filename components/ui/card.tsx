import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#ebe7ff] bg-white shadow-[0_14px_34px_rgba(47,35,110,0.07)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
