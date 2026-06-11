import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[#ece8ff] bg-white shadow-[0_12px_30px_rgba(47,35,110,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
