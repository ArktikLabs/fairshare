"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Card>
      <EmptyState
        icon={<TriangleAlert />}
        title="Something went wrong"
        description="The page could not be loaded. Try again, or go back to the dashboard."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/dashboard" variant="secondary">
              Dashboard
            </ButtonLink>
          </div>
        }
      />
    </Card>
  );
}
