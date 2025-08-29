"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  group: {
    id: string;
    name: string;
    currency: string;
  } | null;
  payers: Array<{
    user: User;
    amount: number;
  }>;
  splits: Array<{
    user: User;
    amount: number;
  }>;
}

const CATEGORY_ICONS: Record<string, string> = {
  FOOD_DRINK: "🍽️",
  TRANSPORTATION: "🚗",
  ACCOMMODATION: "🏨",
  ENTERTAINMENT: "🎬",
  SHOPPING: "🛍️",
  UTILITIES: "⚡",
  HEALTHCARE: "🏥",
  EDUCATION: "📚",
  TRAVEL: "✈️",
  OTHER: "📦",
};

const CATEGORY_LABELS: Record<string, string> = {
  FOOD_DRINK: "Food & Drink",
  TRANSPORTATION: "Transportation",
  ACCOMMODATION: "Accommodation",
  ENTERTAINMENT: "Entertainment",
  SHOPPING: "Shopping",
  UTILITIES: "Utilities",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  TRAVEL: "Travel",
  OTHER: "Other",
};

export default function ExpensesList() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/expenses");
        
        if (response.ok) {
          const data = await response.json();
          setExpenses(data.expenses || []);
        } else {
          setError("Failed to load expenses");
        }
      } catch (err) {
        console.error("Error fetching expenses:", err);
        setError("Failed to load expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [session?.user?.id]);

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserRole = (expense: Expense) => {
    const isPayer = expense.payers.some(p => p.user.id === session?.user?.id);
    const isSplit = expense.splits.some(s => s.user.id === session?.user?.id);
    
    if (isPayer && isSplit) return "paid & owes";
    if (isPayer) return "paid";
    if (isSplit) return "owes";
    return "not involved";
  };

  const getUserAmount = (expense: Expense) => {
    const paidAmount = expense.payers.find(p => p.user.id === session?.user?.id)?.amount || 0;
    const owedAmount = expense.splits.find(s => s.user.id === session?.user?.id)?.amount || 0;
    
    return { paid: paidAmount, owed: owedAmount, net: paidAmount - owedAmount };
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(filter.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(filter.toLowerCase()) ||
                         expense.group?.name.toLowerCase().includes(filter.toLowerCase());
    
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">
            Please sign in to view your expenses
          </h1>
          <Link
            href="/auth/signin"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-display font-bold text-gray-900">
                Fair<span className="text-green-600">Share</span>
              </Link>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600 font-medium">All Expenses</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/expenses/create"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Add Expense
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">
            All Expenses
          </h1>
          <p className="text-gray-600 mt-2 font-body">
            View and manage all your expenses across groups
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-body">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                Search Expenses
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by description, notes, or group..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                Filter by Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {CATEGORY_ICONS[key]} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-body">Loading expenses...</p>
            </div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-display font-medium text-gray-900 mb-2">
              {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
            </h3>
            <p className="text-gray-600 font-body mb-6">
              {expenses.length === 0 
                ? "Start by creating your first expense to split with others."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            {expenses.length === 0 && (
              <Link
                href="/expenses/create"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create First Expense
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => {
              const userAmounts = getUserAmount(expense);
              const userRole = getUserRole(expense);
              
              return (
                <div key={expense.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">
                          {CATEGORY_ICONS[expense.category] || "📦"}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 font-body text-lg">
                              {expense.description}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                              <span>{formatDate(expense.date)}</span>
                              <span>•</span>
                              <span>{CATEGORY_LABELS[expense.category] || expense.category}</span>
                              {expense.group && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600">{expense.group.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-semibold text-gray-900 font-body">
                              {formatCurrency(expense.amount, expense.group?.currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {expense.payers.length === 1 ? "Single payer" : `${expense.payers.length} payers`}
                            </p>
                          </div>
                        </div>

                        {expense.notes && (
                          <p className="text-gray-600 text-sm font-body mb-3">
                            {expense.notes}
                          </p>
                        )}

                        {/* User's involvement */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">
                              Your involvement:
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              userRole === "not involved" ? "bg-gray-100 text-gray-800" :
                              userRole === "paid" ? "bg-green-100 text-green-800" :
                              userRole === "owes" ? "bg-red-100 text-red-800" :
                              "bg-blue-100 text-blue-800"
                            }`}>
                              {userRole}
                            </span>
                          </div>
                          
                          {userRole !== "not involved" && (
                            <div className="flex items-center space-x-4 text-sm">
                              {userAmounts.paid > 0 && (
                                <span className="text-green-600">
                                  Paid: {formatCurrency(userAmounts.paid, expense.group?.currency)}
                                </span>
                              )}
                              {userAmounts.owed > 0 && (
                                <span className="text-red-600">
                                  Owes: {formatCurrency(userAmounts.owed, expense.group?.currency)}
                                </span>
                              )}
                              {userRole === "paid & owes" && (
                                <span className={`font-medium ${
                                  userAmounts.net >= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  Net: {userAmounts.net >= 0 ? "+" : ""}{formatCurrency(userAmounts.net, expense.group?.currency)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Payers and splits summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Paid by:</h4>
                            <div className="space-y-1">
                              {expense.payers.map((payer, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {payer.user.name || payer.user.email}
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(payer.amount, expense.group?.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Split between:</h4>
                            <div className="space-y-1">
                              {expense.splits.slice(0, 3).map((split, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {split.user.name || split.user.email}
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(split.amount, expense.group?.currency)}
                                  </span>
                                </div>
                              ))}
                              {expense.splits.length > 3 && (
                                <div className="text-sm text-gray-500">
                                  +{expense.splits.length - 3} more...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
