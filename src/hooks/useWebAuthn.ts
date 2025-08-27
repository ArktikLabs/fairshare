"use client";

import { useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";

export function useWebAuthn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPasskey = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get registration options from server
      const optionsResponse = await fetch("/api/webauthn/register");
      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      // Start WebAuthn registration
      const credential = await startRegistration(options);

      // Verify registration with server
      const verificationResponse = await fetch("/api/webauthn/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
        }),
      });

      if (!verificationResponse.ok) {
        throw new Error("Registration verification failed");
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.verified) {
        return { success: true };
      } else {
        throw new Error("Registration verification failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithPasskey = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get authentication options from server
      const optionsResponse = await fetch("/api/webauthn/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();

      // Start WebAuthn authentication
      const credential = await startAuthentication(options);

      // Verify authentication with server
      const verificationResponse = await fetch("/api/webauthn/authenticate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
          userId: options.userId,
        }),
      });

      if (!verificationResponse.ok) {
        throw new Error("Authentication verification failed");
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.verified) {
        // Use NextAuth's signIn to create a proper session
        const result = await signIn("credentials", {
          email: email,
          password: "webauthn-verified", // Special marker for WebAuthn
          redirect: false,
        });

        if (result?.ok) {
          return { success: true, user: verificationResult.user };
        } else {
          throw new Error("Failed to create session");
        }
      } else {
        throw new Error("Authentication verification failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    registerPasskey,
    authenticateWithPasskey,
    isLoading,
    error,
  };
}
