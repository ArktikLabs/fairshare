// Runs the notification dispatcher for an activity after its transaction
// commits, without blocking or failing the request. recordActivity() may be
// called inside prisma.$transaction, where we cannot see the commit, so the
// dispatcher retries briefly until the row is visible (a rolled-back row
// never appears and is dropped). Anything missed (crash, restart) is picked
// up by the cron job via Activity.notifiedAt.

const DELAYS = [150, 600, 2000, 5000];

export function scheduleNotify(activityId: string, committed: boolean) {
  if (process.env.NOTIFY_DISABLED === "1") return;
  const attempt = (i: number) => {
    setTimeout(async () => {
      try {
        const { dispatchActivity } = await import("./dispatch");
        const r = await dispatchActivity(activityId);
        if (r === "missing" && i + 1 < DELAYS.length) attempt(i + 1);
      } catch (e) {
        console.error("[notify] dispatch failed", activityId, e);
      }
    }, committed && i === 0 ? 0 : DELAYS[i]);
  };
  attempt(0);
}
