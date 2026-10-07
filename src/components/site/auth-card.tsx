import Link from "next/link";
import { Logo } from "@/components/app-shell";

/** Centered card layout for sign-in / register / password pages. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-block" aria-label="FairShare home">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>}
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
        </p>
      </div>
    </div>
  );
}
