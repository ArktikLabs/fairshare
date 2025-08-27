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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Passkey Management
      </h2>

      <div className="space-y-4">
        <div>
          <p className="text-gray-600 mb-4">
            Register a passkey for secure, passwordless authentication using
            your device&apos;s biometrics or security key.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-600 text-sm">
              Passkey registered successfully! You can now use it to sign in.
            </p>
          </div>
        )}

        <button
          onClick={handleRegisterPasskey}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? "Registering..." : "Register Passkey"}
        </button>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">About Passkeys</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use your fingerprint, face, or device PIN to authenticate</li>
            <li>• No passwords to remember or type</li>
            <li>• More secure than traditional passwords</li>
            <li>• Works across your devices with the same account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
