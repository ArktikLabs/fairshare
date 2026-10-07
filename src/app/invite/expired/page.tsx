import { ButtonLink } from "@/components/ui/button";
import { AuthCard } from "@/components/site/auth-card";

export default function InvitationExpired() {
  return (
    <AuthCard title="Invitation expired" subtitle="This invitation link has expired or was cancelled. Ask a group admin to invite you again; the new email contains a fresh link.">
      <div className="space-y-2">
        <ButtonLink href="/dashboard" className="w-full">
          Go to dashboard
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="w-full">
          FairShare home
        </ButtonLink>
      </div>
    </AuthCard>
  );
}
