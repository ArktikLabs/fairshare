"use client";

import { useState } from "react";
import { useWebAuthn } from "@/hooks/useWebAuthn";

export default function PasskeyManagement() {
  const { registerPasskey, isLoading, error } = useWebAuthn();
  const [success, setSuccess] = useState(false);

  const handleRegisterPasskey = async () => {
    setSuccess(false);
    const result = await registerPasskey();

    if (result.success) {
      setSuccess(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🔐</span>
          Passkey Management
        </h2>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <p className="text-gray-600 font-body">
            Register a passkey for secure, passwordless authentication using
            your device&apos;s biometrics or security key.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-body">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-body">
            <div className="flex items-center">
              <span className="mr-2">✅</span>
              Passkey registered successfully! You can now use it to sign in.
            </div>
          </div>
        )}

        <button
          onClick={handleRegisterPasskey}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-display tracking-tight"
        >
          {isLoading ? (
            <span className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Registering...
            </span>
          ) : (
            <span className="flex items-center">
              <span className="mr-2">🔐</span>
              Register Passkey
            </span>
          )}
        </button>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-3 font-display flex items-center">
            <span className="mr-2">💡</span>
            About Passkeys
          </h3>
          <ul className="text-sm text-blue-700 space-y-2 font-body">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Use your fingerprint, face, or device PIN to authenticate
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              No passwords to remember or type
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              More secure than traditional passwords
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Works across your devices with the same account
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
