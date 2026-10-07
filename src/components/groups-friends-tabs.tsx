import Link from "next/link";
import { cn } from "@/lib/cn";

/** "Groups | Friends" switch at the top of both lists (mobile has no Friends tab). */
export function GroupsFriendsTabs({ current }: { current: "groups" | "friends" }) {
  const tabs = [
    { key: "groups", href: "/groups", label: "Groups" },
    { key: "friends", href: "/friends", label: "Friends" },
  ] as const;
  return (
    <nav aria-label="Groups or friends" className="mb-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 sm:inline-grid sm:w-64">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-center text-sm font-medium",
            current === t.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
