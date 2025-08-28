"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SessionDebugger } from "@/components/SessionDebugger";
import Link from "next/link";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) router.push("/auth/signin"); // Not signed in
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-display text-gray-700">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-display tracking-tight text-gray-900">
                Fair<span className="text-green-600">Share</span>
              </h1>
            </Link>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <Link
                  href="/account"
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {session.user?.name
                        ? session.user.name[0].toUpperCase()
                        : session.user?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {session.user?.name || "User"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {session.user?.email}
                    </p>
                  </div>
                </Link>
              </div>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-display tracking-tight text-gray-900 mb-2">
              Welcome back, {session.user?.name || "there"}! 👋
            </h1>
            <p className="text-lg text-gray-600 font-body">
              Manage your shared expenses and track what you owe.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-display font-semibold text-gray-900 mt-1">
                    $0.00
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">You Owe</p>
                  <p className="text-2xl font-display font-semibold text-red-600 mt-1">
                    $0.00
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📤</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    You're Owed
                  </p>
                  <p className="text-2xl font-display font-semibold text-green-600 mt-1">
                    $0.00
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">👤</span>
                  Account Information
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-600">
                    Email
                  </span>
                  <span className="text-sm text-gray-900 font-body">
                    {session.user?.email}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-600">
                    Display Name
                  </span>
                  <span className="text-sm text-gray-900 font-body">
                    {session.user?.name || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-600">
                    User ID
                  </span>
                  <span className="text-sm text-gray-500 font-mono text-xs">
                    {session.user?.id}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-600">
                    Member Since
                  </span>
                  <span className="text-sm text-gray-900 font-body">Today</span>
                </div>
                <div className="pt-3">
                  <Link
                    href="/account"
                    className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                  >
                    Manage Account Settings →
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📊</span>
                  Recent Activity
                </h2>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h3 className="text-lg font-display font-medium text-gray-900 mb-2">
                    You're all set!
                  </h3>
                  <p className="text-gray-600 font-body mb-4">
                    Start by creating your first expense or group.
                  </p>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-display font-semibold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200">
                    <span className="text-2xl">➕</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Add Expense
                  </h3>
                  <p className="text-sm text-gray-600">
                    Record a new shared expense
                  </p>
                </div>
              </button>

              <button className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Create Group
                  </h3>
                  <p className="text-sm text-gray-600">
                    Start a new expense group
                  </p>
                </div>
              </button>

              <button className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200">
                    <span className="text-2xl">💳</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Settle Up</h3>
                  <p className="text-sm text-gray-600">Pay back what you owe</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Session Debugger - only shows in development */}
      <SessionDebugger />
    </div>
  );
}
