"use client";

import { useSyncExternalStore } from "react";
import { ExpenseForm, LAST_GROUP_KEY, type FormGroup } from "./expense-form";
import { Skeleton } from "@/components/ui/primitives";

const noop = () => () => {};

/** /expenses/create: start in the last group used on this device. */
export function PickGroupExpenseForm({ groups, currentUserId }: { groups: FormGroup[]; currentUserId: string }) {
  // null on the server, the stored id (or "") on the client
  const stored = useSyncExternalStore(
    noop,
    () => {
      try {
        return localStorage.getItem(LAST_GROUP_KEY) ?? "";
      } catch {
        return "";
      }
    },
    () => null
  );
  if (stored === null) return <Skeleton className="h-96 w-full" />;
  const initial = groups.find((g) => g.id === stored)?.id ?? groups[0].id;
  return <ExpenseForm groups={groups} initialGroupId={initial} currentUserId={currentUserId} allowGroupSwitch />;
}
