"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/primitives";
import { AuthCard } from "@/components/site/auth-card";
import { formatDate } from "@/lib/utils";

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
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) setInvitation(data);
        else setError(data.error || "This invitation is not valid or has expired");
      } catch {
        setError("Could not load the invitation");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      } else setError(data.error || "Could not accept the invitation");
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
      <AuthCard title="Loading invitation">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      </AuthCard>
    );
  }

  if (!invitation) {
    return (
      <AuthCard title="Invitation not valid" subtitle={error || "This invitation link is not valid."}>
        <p className="mb-4 text-sm text-slate-600">Ask the person who invited you to send a new invite.</p>
        <ButtonLink href={session ? "/dashboard" : "/"} className="w-full">
          {session ? "Go to dashboard" : "Go to FairShare"}
        </ButtonLink>
      </AuthCard>
    );
  }

  const inviter = invitation.inviter?.name || invitation.inviter?.email || "Someone";
  return (
    <AuthCard
      title={`Join ${invitation.group.name}`}
      subtitle={
        <>
          {inviter} invited <span className="font-medium text-slate-700">{invitedEmail}</span> to split expenses.
        </>
      }
    >
      <dl className="mb-5 space-y-1 text-sm">
        {invitation.group.description && <p className="mb-2 text-slate-600">{invitation.group.description}</p>}
        <div className="flex justify-between">
          <dt className="text-slate-500">Currency</dt>
          <dd className="font-medium text-slate-900">{invitation.group.currency}</dd>
        </div>
        {invitation.expiresAt && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Invite expires</dt>
            <dd className="text-slate-900">{formatDate(invitation.expiresAt)}</dd>
          </div>
        )}
      </dl>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {session ? (
        <div className="space-y-3">
          {isOtherAccount && (
            <Alert tone="warning">
              You are signed in as {session.user?.email}. Accepting adds this account to the group
              {invitation.user.isGhost ? ", and expenses already recorded for the invited email move to it." : "."}
            </Alert>
          )}
          <Button onClick={accept} disabled={accepting} className="w-full" size="lg">
            {accepting ? "Joining..." : "Accept and join"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {invitation.user.isGhost && (
            <ButtonLink
              href={`/auth/register?email=${encodeURIComponent(invitedEmail)}&callbackUrl=${encodeURIComponent(here)}`}
              className="w-full"
              size="lg"
            >
              Create account to join
            </ButtonLink>
          )}
          <ButtonLink
            href={`/auth/signin?callbackUrl=${encodeURIComponent(here)}`}
            variant={invitation.user.isGhost ? "secondary" : "primary"}
            className="w-full"
            size="lg"
          >
            I already have an account
          </ButtonLink>
        </div>
      )}
    </AuthCard>
  );
}
