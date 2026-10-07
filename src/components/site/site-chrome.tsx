import Link from "next/link";
import { auth } from "@/auth";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/app-shell";

/** Header + footer for public pages (landing, legal). */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="FairShare home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
            <Link href="/#how-it-works" className="hidden rounded-md px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 sm:inline">
              How it works
            </Link>
            {signedIn ? (
              <ButtonLink href="/dashboard" size="sm">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/auth/signin" size="sm" variant="ghost">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/auth/register" size="sm">
                  Sign up free
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>FairShare is made by Arktik · <a href="mailto:hello@arktik.id" className="hover:text-slate-900">hello@arktik.id</a></p>
          <nav className="flex gap-4" aria-label="Legal">
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
