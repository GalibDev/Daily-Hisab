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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        variant === "primary" &&
          "bg-[#6C4CF1] text-white shadow-[0_10px_22px_rgba(108,76,241,0.25)] hover:bg-[#5d3fe0]",
        variant === "outline" &&
          "border border-[#d8d1ff] bg-white text-[#6C4CF1] hover:bg-[#f4f1ff]",
        variant === "ghost" && "text-[#6C4CF1] hover:bg-[#f4f1ff]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
