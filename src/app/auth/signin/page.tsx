"use client";

import { useState, useEffect } from "react";
import { signIn, getSession, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import Link from "next/link";

type Provider = {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
};

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null
  );
  const [isPasskeyMode, setIsPasskeyMode] = useState(false);
  const router = useRouter();
  const {
    authenticateWithPasskey,
    isLoading: passkeyLoading,
    error: passkeyError,
  } = useWebAuthn();

  useEffect(() => {
    const getAuthProviders = async () => {
      const providers = await getProviders();
      setProviders(providers);
    };
    getAuthProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Please check your email and password.");
      } else {
        // Get the updated session
        const session = await getSession();
        if (session) {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required for passkey authentication");
      return;
    }

    const result = await authenticateWithPasskey(email);
    if (result.success) {
      // NextAuth session is now created, redirect to dashboard
      router.push("/dashboard");
    } else {
      setError(result.error || "Passkey authentication failed");
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
            Welcome back
          </h2>
          <p className="text-gray-600 font-body">
            Sign in to continue managing your shared expenses
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Auth Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsPasskeyMode(false)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                !isPasskeyMode
                  ? "bg-white text-green-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">🔑</span>
              Password
            </button>
            <button
              type="button"
              onClick={() => setIsPasskeyMode(true)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                isPasskeyMode
                  ? "bg-white text-green-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">🔐</span>
              Passkey
            </button>
          </div>

          {/* Error Message */}
          {(error || passkeyError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-body">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error || passkeyError}
              </div>
            </div>
          )}

          {/* Password Form */}
          {!isPasskeyMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
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
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-body placeholder-gray-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-display tracking-tight"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            /* Passkey Form */
            <form onSubmit={handlePasskeyAuth} className="space-y-4">
              <div>
                <label
                  htmlFor="passkey-email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="passkey-email"
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

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-4xl mb-2">🔐</div>
                <p className="text-sm text-gray-600 font-body">
                  Use your fingerprint, face, or device PIN to sign in securely
                </p>
              </div>

              <button
                type="submit"
                disabled={passkeyLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-display tracking-tight"
              >
                {passkeyLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🔐</span>
                    Sign in with Passkey
                  </span>
                )}
              </button>
            </form>
          )}

          {/* OAuth Providers */}
          {providers &&
            Object.values(providers).filter(
              (provider: Provider) => provider.id !== "credentials"
            ).length > 0 && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-body">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {providers &&
                    Object.values(providers)
                      .filter(
                        (provider: Provider) => provider.id !== "credentials"
                      )
                      .map((provider: Provider) => (
                        <button
                          key={provider.name}
                          onClick={() => signIn(provider.id)}
                          className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                        >
                          Sign in with {provider.name}
                        </button>
                      ))}
                </div>
              </div>
            )}
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600 font-body">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-green-600 hover:text-green-500 transition-colors"
            >
              Create account
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
