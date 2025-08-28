"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred");
      } else {
        // Registration successful, redirect to sign in
        router.push(
          "/auth/signin?message=Registration successful. Please sign in."
        );
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-display tracking-tight text-gray-900">
              Fair<span className="text-green-600">Share</span>
            </h1>
          </Link>
          <h2 className="text-2xl font-display tracking-tight text-gray-900 mb-2">
            Join FairShare
          </h2>
          <p className="text-gray-600 font-body">
            Create your account and start sharing expenses fairly
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-body">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
                <span className="text-gray-400 font-normal"> (optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-body placeholder-gray-400"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-body placeholder-gray-400"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-body placeholder-gray-400"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500 font-body">
                Use at least 8 characters with a mix of letters, numbers, and symbols
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-display tracking-tight"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">🚀</span>
                  Create Account
                </span>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 font-body mb-3">
              What you get with FairShare:
            </p>
            <ul className="space-y-2 text-sm text-gray-600 font-body">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Track shared expenses with friends
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Split bills automatically
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Secure passkey authentication
              </li>
            </ul>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600 font-body">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-green-600 hover:text-green-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-body"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
