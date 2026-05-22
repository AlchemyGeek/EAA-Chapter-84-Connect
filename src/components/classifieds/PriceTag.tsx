import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/classifieds/types";

interface Props {
  price: number | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceTag({ price, className, size = "md" }: Props) {
  const formatted = formatPrice(price);
  if (formatted === null) return null;
  const sizeClass =
    size === "lg"
      ? "text-2xl sm:text-3xl"
      : size === "sm"
        ? "text-sm"
        : "text-lg";
  return (
    <span
      className={cn(
        "font-semibold tabular-nums text-primary",
        sizeClass,
        className,
      )}
    >
      {formatted}
    </span>
  );
}
