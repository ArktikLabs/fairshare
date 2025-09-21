"use client";

import { useRouter } from "next/navigation";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import AuthenticatedPageLayout from "@/components/layout/AuthenticatedPageLayout";
import { ExpenseCategoryOption } from "@/types/expense";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function NewExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const { expenseCategories, loading: expenseCategoriesLoading } =
    useExpenseCategories();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/auth/signin");
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-display text-gray-700">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <AuthenticatedPageLayout
      session={session}
      title="Record new expense"
      subtitle="Capture the details, decide how to split it, and keep everyone in the loop."
    >
      <div className="">
        <ExpenseForm
          expenseCategories={expenseCategories}
          defaultCurrency={preferences?.currency ?? "USD"}
          currentUser={{
            id: session.user.id,
            name: session.user.name ?? undefined,
            email: session.user.email ?? undefined,
          }}
        />
      </div>
    </AuthenticatedPageLayout>
  );
}
