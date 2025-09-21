"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import type { Session } from "next-auth";
import { useMemo, type ReactNode } from "react";
import { redirect } from "next/navigation";

type AuthenticatedPageLayoutProps = {
  children: ReactNode;
  session: Session;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function AuthenticatedPageLayout({
  children,
  session,
  title,
  subtitle,
  actions,
}: AuthenticatedPageLayoutProps) {
  const { user } = session;

  const userDisplay = useMemo(() => {
    const name = user?.name?.trim();
    if (name) {
      return {
        title: name,
        initial: name[0]?.toUpperCase() ?? "?",
      };
    }

    const email = user?.email?.trim();
    if (email) {
      return {
        title: email,
        initial: email[0]?.toUpperCase() ?? "?",
      };
    }

    return { title: "User", initial: "?" };
  }, [user?.name, user?.email]);

  return (
    <div className="space-y-8">
      <div>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
          <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="flex items-center">
                  <h1 className="text-2xl font-display tracking-tight text-gray-900">
                    Fair<span className="text-green-600">Share</span>
                  </h1>
                </Link>

                <div className="flex items-center space-x-4">
                  <div className="hidden sm:flex items-center space-x-3">
                    <Link
                      href="/account"
                      className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {userDisplay.initial}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {userDisplay.title}
                        </p>
                        <p className="text-gray-500 text-xs">{user?.email}</p>
                      </div>
                    </Link>
                  </div>
                  <Link
                    href="/dashboard"
                    className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/account"
                    className="text-gray-600 hover:text-green-600 transition-colors font-medium text-sm"
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 mt-6">
              <div>
                <h1 className="text-3xl font-display tracking-tight text-gray-900">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 text-gray-600 font-body text-base">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex items-center gap-3">{actions}</div>
              ) : null}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
