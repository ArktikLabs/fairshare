import { Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";

export function ExportCard({ groupId }: { groupId: string }) {
  return (
    <Card>
      <CardHeader title="Export" description="Every expense with each member's share, then the payments. Opens in Excel, Numbers or Sheets." />
      <CardBody>
        <a href={`/api/groups/${groupId}/export.csv`} download className={buttonClass("secondary", "md")}>
          <Download /> Download CSV
        </a>
      </CardBody>
    </Card>
  );
}
