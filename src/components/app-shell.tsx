"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  ArrowLeftRight,
  Home,
  LogOut,
  Plus,
  Receipt,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/primitives";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold text-slate-900", className)}>
      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white">
        <ArrowLeftRight className="size-4" aria-hidden />
      </span>
      FairShare
    </span>
  );
}

const DESKTOP_NAV = [
  { href: "/dashboard", label: "Dashboard", match: ["/dashboard"] },
  { href: "/groups", label: "Groups", match: ["/groups"] },
  { href: "/expenses", label: "Expenses", match: ["/expenses"] },
  { href: "/settlements", label: "Settle up", match: ["/settlements"] },
  { href: "/activity", label: "Activity", match: ["/activity"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string | null; email: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const displayName = user.name || user.email || "Account";
  const onCreate = pathname === "/expenses/create" || /^\/groups\/[^/]+\/expenses\/create$/.test(pathname);

  const tabs = [
    { href: "/dashboard", label: "Home", icon: Home, active: isActive(pathname, ["/dashboard"]) },
    { href: "/groups", label: "Groups", icon: Users, active: isActive(pathname, ["/groups"]) },
    { href: "/expenses/create", label: "Add", icon: Plus, active: onCreate, primary: true },
    { href: "/settlements", label: "Settle up", icon: ArrowLeftRight, active: isActive(pathname, ["/settlements"]) },
    { href: "/activity", label: "Activity", icon: Activity, active: isActive(pathname, ["/activity"]) },
  ];

  return (
    <div className="min-h-svh bg-slate-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="FairShare dashboard">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {DESKTOP_NAV.map((n) => {
              const active = isActive(pathname, n.match) && !(n.href === "/expenses" && onCreate);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/expenses"
              aria-label="All expenses"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg md:hidden",
                isActive(pathname, ["/expenses"]) && !onCreate ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Receipt className="size-5" />
            </Link>
            <Link
              href="/expenses/create"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700 md:inline-flex"
            >
              <Plus className="size-4" aria-hidden />
              Add expense
            </Link>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger
                aria-label="Account menu"
                className={cn(
                  "inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  isActive(pathname, ["/account"]) && "ring-2 ring-brand-500 ring-offset-2 md:ring-0 md:ring-offset-0"
                )}
              >
                <Avatar name={displayName} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-56 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg"
                >
                  <div className="px-2.5 py-2">
                    <p className="truncate font-medium text-slate-900">{user.name || "Signed in"}</p>
                    {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    >
                      <UserRound className="size-4" /> Account
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => signOut({ callbackUrl: "/" })}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                  >
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Tabs"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {tabs.map((t) => (
            <li key={t.href} className="flex">
              <Link
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  t.active ? "text-brand-700" : "text-slate-500"
                )}
              >
                {t.primary ? (
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                ) : (
                  <t.icon className="size-5" aria-hidden />
                )}
                <span className={t.primary ? "sr-only" : undefined}>{t.primary ? "Add expense" : t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
