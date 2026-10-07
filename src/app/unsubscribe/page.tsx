import { AuthCard } from "@/components/site/auth-card";
import { ButtonLink } from "@/components/ui/button";
import { readUnsubscribeToken } from "@/lib/notify/token";
import { eventInfo, isNotifyEvent } from "@/lib/notify/events";
import { UnsubscribeButton } from "./unsubscribe-button";

export const metadata = { title: "Unsubscribe · FairShare", robots: { index: false } };
export const dynamic = "force-dynamic";

// Opening the link does not unsubscribe by itself (mail scanners open
// links); one click on the button does, no login needed.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const claim = readUnsubscribeToken(t);
  if (!claim || (claim.e !== "digest" && !isNotifyEvent(claim.e))) {
    return (
      <AuthCard title="Link not valid" subtitle="This unsubscribe link is broken or incomplete. You can change every notification in your account.">
        <ButtonLink href="/account?tab=notifications" className="w-full">
          Notification settings
        </ButtonLink>
      </AuthCard>
    );
  }
  const what =
    claim.e === "digest"
      ? "the weekly summary email"
      : `${eventInfo(claim.e).label.toLowerCase()} by ${claim.c === "email" ? "email" : "WhatsApp"}`;
  return (
    <AuthCard title="Unsubscribe" subtitle={`Stop getting ${what}? Other notifications stay as they are.`}>
      <UnsubscribeButton token={t!} what={what} />
    </AuthCard>
  );
}
