import {
  BookOpen,
  Bus,
  Clapperboard,
  HeartPulse,
  Hotel,
  Package,
  Plane,
  ShoppingBag,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { categoryLabel, type CategoryValue } from "@/lib/categories";

export const CATEGORY_ICONS: Record<CategoryValue, LucideIcon> = {
  FOOD_DRINK: Utensils,
  TRANSPORTATION: Bus,
  ACCOMMODATION: Hotel,
  ENTERTAINMENT: Clapperboard,
  SHOPPING: ShoppingBag,
  UTILITIES: Zap,
  HEALTHCARE: HeartPulse,
  EDUCATION: BookOpen,
  TRAVEL: Plane,
  OTHER: Package,
};

export function CategoryIcon({
  category,
  className,
  size = "md",
}: {
  category: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}) {
  const Icon = CATEGORY_ICONS[(category as CategoryValue) ?? "OTHER"] ?? Package;
  return (
    <span
      title={categoryLabel(category)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-9 [&_svg]:size-4",
        className
      )}
    >
      <Icon aria-hidden />
      <span className="sr-only">{categoryLabel(category)}</span>
    </span>
  );
}
