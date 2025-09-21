export type ExpenseCategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  icon: string | null;
  color: string | null;
  scope: string | null;
};

export type ExpenseParticipantFormValue = {
  userId: string;
  name: string;
  email?: string | null;
  shareAmount?: string;
};

export type ExpenseFormPayload = {
  description: string;
  notes?: string;
  amount: string;
  currency: string;
  occurredAt: string;
  dueAt?: string | null;
  splitMethod: "equal" | "exact";
  categoryId?: string | null;
  paidByUserId: string;
  participants: Array<{
    userId: string;
    shareAmount?: string;
  }>;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
};

export type NewExpenseCategoryInput = {
  name: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
};
