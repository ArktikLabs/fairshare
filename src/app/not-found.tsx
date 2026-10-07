import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/app-shell";

// Global 404 (outside the signed-in shell, e.g. unknown public URLs).
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <FileQuestion className="size-5" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">The page you are looking for does not exist.</p>
      <div className="mt-5 flex gap-2">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
