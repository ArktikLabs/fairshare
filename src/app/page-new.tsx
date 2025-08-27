"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Fair<span className="text-indigo-600">Share</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A modern platform for fair and transparent sharing of resources,
            expenses, and responsibilities.
          </p>
        </header>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto">
          {session ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Welcome back, {session.user?.name || session.user?.email}!
              </h2>
              <Link
                href="/dashboard"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                Get Started
              </h2>
              <div className="space-y-4">
                <Link
                  href="/auth/signin"
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="block w-full bg-white hover:bg-gray-50 text-indigo-600 text-center font-medium py-3 px-4 rounded-lg border-2 border-indigo-600 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-indigo-600 text-xl">⚖️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fair Distribution
            </h3>
            <p className="text-gray-600">
              Ensure equal and fair distribution of shared resources and
              expenses.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-indigo-600 text-xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Transparent Tracking
            </h3>
            <p className="text-gray-600">
              Keep track of all transactions and contributions with full
              transparency.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-indigo-600 text-xl">👥</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Team Collaboration
            </h3>
            <p className="text-gray-600">
              Work together seamlessly with your team or group members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
