"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface InvitationDetails {
  id: string;
  role: string;
  user: { email: string; displayName: string | null; isGhost: boolean };
  group: { id: string; name: string; description?: string | null; currency: string };
  inviter: { name: string | null; email: string } | null;
  expiresAt: string | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const response = await fetch(`/api/invite/${token}`);
        const data = await response.json();
        if (response.ok) setInvitation(data);
        else setError(data.error || "Invalid or expired invitation");
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const response = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        router.push(data.redirectTo || "/dashboard");
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const here = `/invite/${token}`;
  const invitedEmail = invitation?.user.email || "";
  const signedInAs = session?.user?.email?.toLowerCase();
  const isOtherAccount = Boolean(signedInAs && invitedEmail && signedInAs !== invitedEmail.toLowerCase());

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid invitation</h1>
          <p className="text-gray-600 mb-4">{error || "This invitation link is not valid."}</p>
          <Link href="/dashboard" className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join {invitation.group.name}</h1>
        <p className="text-gray-600 mb-6">
          {invitation.inviter?.name || invitation.inviter?.email || "Someone"} invited{" "}
          <strong>{invitedEmail}</strong> to split expenses in this group.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-sm text-blue-800 space-y-1">
          {invitation.group.description && <p>{invitation.group.description}</p>}
          <p>Currency: {invitation.group.currency}</p>
          <p>Role: {invitation.role.toLowerCase()}</p>
          {invitation.expiresAt && (
            <p>Expires: {new Date(invitation.expiresAt).toLocaleDateString()}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
        )}

        {session ? (
          <div className="space-y-3">
            {isOtherAccount && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                You are signed in as {session.user?.email}. Accepting adds this account to the group
                {invitation.user.isGhost
                  ? ", and expenses already recorded for the invited email move to it."
                  : "."}
              </p>
            )}
            <button
              onClick={accept}
              disabled={accepting}
              className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {accepting ? "Joining..." : "Accept invitation"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {invitation.user.isGhost ? (
              <Link
                href={`/auth/register?email=${encodeURIComponent(invitedEmail)}&callbackUrl=${encodeURIComponent(here)}`}
                className="block w-full text-center py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create account to join
              </Link>
            ) : null}
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(here)}`}
              className="block w-full text-center py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              I already have an account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
