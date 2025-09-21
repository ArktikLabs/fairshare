import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ExpenseCategoryParent {
  id: string | null;
  name: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  parent: ExpenseCategoryParent | null;
  icon: string | null;
  color: string | null;
  scope: string | null;
}

type ApiExpenseCategory = {
  id?: unknown;
  name?: unknown;
  parent?: unknown;
  icon?: unknown;
  color?: unknown;
  scope?: unknown;
};

const normalizeCategory = (category: unknown): ExpenseCategory | null => {
  if (!category || typeof category !== "object") {
    return null;
  }

  const { id, name, parent, icon, color, scope } = category as ApiExpenseCategory;

  if (typeof id !== "string" || typeof name !== "string") {
    return null;
  }

  let normalizedParent: ExpenseCategoryParent | null = null;
  if (parent && typeof parent === "object") {
    const parentData = parent as { id?: unknown; name?: unknown };
    const parentId = typeof parentData.id === "string" ? parentData.id : null;
    const parentName = typeof parentData.name === "string" ? parentData.name : null;

    if (parentId !== null || parentName !== null) {
      normalizedParent = { id: parentId, name: parentName };
    }
  }

  return {
    id,
    name,
    parent: normalizedParent,
    icon: typeof icon === "string" ? icon : null,
    color: typeof color === "string" ? color : null,
    scope: typeof scope === "string" ? scope : null,
  };
};

export function useExpenseCategories() {
  const { data: session } = useSession();
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenseCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/expenses/categories");
      if (!response.ok) {
        throw new Error("Failed to load expense categories");
      }

      const data = await response.json();
      let rawCategories = Array.isArray(data)
        ? data
        : Array.isArray((data as { expenseCategories?: unknown[] }).expenseCategories)
        ? (data as { expenseCategories?: unknown[] }).expenseCategories
        : [];

      if (rawCategories == undefined) {
        rawCategories = [];
      }

      const normalizedCategories = rawCategories
        .map((category) => normalizeCategory(category))
        .filter((category): category is ExpenseCategory => Boolean(category));

      setExpenseCategories(normalizedCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense categories");
      console.error("Error loading expense categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      void loadExpenseCategories();
    }
  }, [session?.user?.id, loadExpenseCategories]);

  return {
    expenseCategories,
    loading,
    error,
  };
}

export type { ExpenseCategory, ExpenseCategoryParent };
