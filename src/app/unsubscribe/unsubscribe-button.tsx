"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

export function UnsubscribeButton({ token, what }: { token: string; what: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const go = async () => {
    setState("busy");
    try {
      const res = await fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="space-y-3">
      {state === "done" ? (
        <Alert tone="success">Done. You will no longer get {what}.</Alert>
      ) : (
        <Button className="w-full" onClick={go} disabled={state === "busy"}>
          {state === "busy" ? "Unsubscribing..." : "Unsubscribe"}
        </Button>
      )}
      {state === "error" && <Alert tone="error">Could not unsubscribe. Try again, or change it in your account.</Alert>}
      <ButtonLink href="/account?tab=notifications" variant="secondary" className="w-full">
        All notification settings
      </ButtonLink>
    </div>
  );
}
