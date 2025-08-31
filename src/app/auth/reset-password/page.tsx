"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      // Keep path, drop query
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "An error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
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
              Password reset successful
            </h2>
            <p className="text-gray-600 font-body">
              Your password has been successfully updated
            </p>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">
                All set!
              </h3>
              <p className="text-gray-600 font-body mb-6">
                You can now sign in with your new password.
              </p>
            </div>

            <Link
              href="/auth/signin"
              className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Continue to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
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
              Invalid reset link
            </h2>
            <p className="text-gray-600 font-body">
              This password reset link is invalid or has expired
            </p>
          </div>

          {/* Error Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">
                Link expired or invalid
              </h3>
              <p className="text-gray-600 font-body mb-6">
                Password reset links expire after 1 hour for security reasons.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/auth/forgot-password"
                className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Request new reset link
              </Link>
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
            Reset your password
          </h2>
          <p className="text-gray-600 font-body">
            Enter your new password below
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div
              id="form-error"
              role="alert"
              aria-live="assertive"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-body"
            >
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
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 font-body"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Enter new password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "form-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body text-gray-900 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2 font-body"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "form-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body text-gray-900 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                aria-busy={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="pt-4">
            <Link
              href="/auth/signin"
              className="block text-center text-green-600 hover:text-green-500 font-medium transition-colors font-body"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return <ResetPasswordContent />;
}
