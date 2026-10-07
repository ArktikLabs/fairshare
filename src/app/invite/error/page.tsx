import { ButtonLink } from "@/components/ui/button";
import { AuthCard } from "@/components/site/auth-card";

export default function InvitationError() {
  return (
    <AuthCard title="Invitation problem" subtitle="Something went wrong with this invitation. Ask the person who invited you to send it again.">
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
