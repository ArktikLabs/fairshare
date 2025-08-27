"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function SessionDebugger() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("Session Debug:", {
      status,
      session,
      user: session?.user,
      expires: session?.expires,
    });
  }, [session, status]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Session Debug</h3>
      <p>
        <strong>Status:</strong> {status}
      </p>
      <p>
        <strong>User ID:</strong> {session?.user?.id || "N/A"}
      </p>
      <p>
        <strong>Email:</strong> {session?.user?.email || "N/A"}
      </p>
      <p>
        <strong>Expires:</strong> {session?.expires || "N/A"}
      </p>
    </div>
  );
}
