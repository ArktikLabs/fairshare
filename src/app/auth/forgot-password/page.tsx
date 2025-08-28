"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "An error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
              Check your email
            </h2>
            <p className="text-gray-600 font-body">
              We&apos;ve sent password reset instructions to your email address
            </p>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">
                Reset link sent!
              </h3>
              <p className="text-gray-600 font-body mb-6">
                If an account with <strong>{email}</strong> exists, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-sm text-gray-500 font-body mb-6">
                Didn&apos;t receive an email? Check your spam folder or try again with a different email address.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Send another reset link
              </button>
              <Link
                href="/auth/signin"
                className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Forgot your password?
          </h2>
          <p className="text-gray-600 font-body">
            Enter your email address and we&apos;ll send you a link to reset your password
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2 font-body"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body text-gray-900 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {/* Links */}
          <div className="space-y-3 pt-4">
            <Link
              href="/auth/signin"
              className="block text-center text-green-600 hover:text-green-500 font-medium transition-colors font-body"
            >
              ← Back to sign in
            </Link>
            <div className="text-center">
              <span className="text-gray-500 text-sm font-body">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-green-600 hover:text-green-500 font-medium transition-colors"
                >
                  Create account
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
