"use client";

import { useState, useEffect } from "react";
import { signIn, getSession, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWebAuthn } from "@/hooks/useWebAuthn";

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
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [isPasskeyMode, setIsPasskeyMode] = useState(false);
  const router = useRouter();
  const { authenticateWithPasskey, isLoading: passkeyLoading, error: passkeyError } = useWebAuthn();

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
        setError("Invalid credentials");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setIsPasskeyMode(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !isPasskeyMode
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setIsPasskeyMode(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isPasskeyMode
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Passkey
            </button>
          </div>
        </div>

        {!isPasskeyMode ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handlePasskeyAuth}>
            {(error || passkeyError) && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error || passkeyError}
              </div>
            )}
            <div>
              <label htmlFor="passkey-email" className="sr-only">
                Email address
              </label>
              <input
                id="passkey-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={passkeyLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {passkeyLoading ? "Authenticating..." : "🔐 Sign in with Passkey"}
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Use your fingerprint, face, or device PIN to sign in securely.
              </p>
            </div>
          </form>
        )}

        {/* OAuth Providers */}
        {providers &&
          Object.values(providers).filter(
            (provider: Provider) => provider.id !== "credentials"
          ).length > 0 && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                {providers &&
                  Object.values(providers)
                    .filter((provider: Provider) => provider.id !== "credentials")
                    .map((provider: Provider) => (
                      <button
                        key={provider.name}
                        onClick={() => signIn(provider.id)}
                        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <span>Sign in with {provider.name}</span>
                      </button>
                    ))}
              </div>
            </div>
          )}

        {/* Register Link */}
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <a
              href="/auth/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
