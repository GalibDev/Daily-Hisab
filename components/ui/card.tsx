import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-[#e8ecf5] bg-white shadow-[0_10px_28px_rgba(20,35,90,0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
