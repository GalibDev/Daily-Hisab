import { cn } from "@/lib/utils";

export function Button({
  className,
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition active:scale-[0.98]",
        variant === "primary" &&
          "bg-[#11298f] text-white shadow-[0_10px_22px_rgba(17,41,143,0.24)] hover:bg-[#0b227f]",
        variant === "outline" &&
          "border border-[#d8dff2] bg-white text-[#11298f] hover:bg-[#f3f5ff]",
        variant === "ghost" && "text-[#11298f] hover:bg-[#f3f5ff]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
