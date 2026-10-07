import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function AppNotFound() {
  return (
    <Card>
      <EmptyState
        icon={<FileQuestion />}
        title="Page not found"
        description="This page does not exist, or you do not have access to it."
        action={<ButtonLink href="/dashboard">Back to dashboard</ButtonLink>}
      />
    </Card>
  );
}
