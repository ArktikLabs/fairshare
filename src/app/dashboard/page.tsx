"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Group {
  id: string;
  name: string;
  currency: string;
  _count: {
    expenses: number;
    members: number;
  };
  memberStatusCount?: {
    active: number;
    invited: number;
  };
}

interface Totals {
  owe: number;
  owed: number;
  net: number;
}

interface Balances {
  totals: Record<string, Totals>;
  groups: Array<{ id: string; name: string; currency: string; net: number }>;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
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
  my?: { paid: number; share: number; net: number };
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

export default function Dashboard() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [expensesRes, groupsRes, balancesRes] = await Promise.all([
          fetch("/api/expenses"),
          fetch("/api/groups"),
          fetch("/api/balances"),
        ]);

        if (expensesRes.ok) {
          setExpenses(await expensesRes.json());
        }
        if (groupsRes.ok) {
          setGroups((await groupsRes.json()) || []);
        }
        if (balancesRes.ok) {
          setBalances(await balancesRes.json());
        }
        if (!expensesRes.ok || !groupsRes.ok || !balancesRes.ok) {
          setError("Some dashboard data could not be loaded");
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id]);

  // Per-currency totals from the group ledgers (groups can use different currencies)
  const totals = Object.entries(balances?.totals ?? {});
  const showTotals = (pick: (t: Totals) => number) =>
    totals.length === 0
      ? formatCurrency(0)
      : totals.map(([currency, t]) => formatCurrency(Math.abs(pick(t)), currency)).join(" · ");
  const netSign = totals.reduce((acc, [, t]) => acc + Math.sign(t.net), 0);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">
            Please sign in to view your dashboard
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
            <div>
              <Link href="/" className="text-2xl font-display font-bold text-gray-900">
                Fair<span className="text-green-600">Share</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/expenses/create"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Add Expense
              </Link>
              <Link
                href="/groups/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Create Group
              </Link>
              <Link
                href="/account"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Welcome back, {session.user?.name || session.user?.email}!
          </h1>
          <p className="text-gray-600 mt-2 font-body">
            Here&apos;s your expense overview and recent activity
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-body">Loading your dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        You Owe
                      </p>
                      <p className="text-2xl font-display font-semibold text-red-600 mt-1">
                        {showTotals((t) => t.owe)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📤</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        You&apos;re Owed
                      </p>
                      <p className="text-2xl font-display font-semibold text-green-600 mt-1">
                        {showTotals((t) => t.owed)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📥</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Net Balance
                      </p>
                      <p className={`text-2xl font-display font-semibold mt-1 ${
                        netSign >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {showTotals((t) => t.net)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">⚖️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-semibold text-gray-900">
                    Settlement Summary
                  </h2>
                  <span className="text-2xl">💰</span>
                </div>
                {(balances?.groups ?? []).filter((g) => g.net !== 0).length === 0 ? (
                  <p className="text-center py-4 text-gray-600">You are all settled up 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {(balances?.groups ?? [])
                      .filter((g) => g.net !== 0)
                      .map((g) => (
                        <Link
                          key={g.id}
                          href={`/groups/${g.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <span className="font-medium text-gray-900">{g.name}</span>
                          <span className={g.net > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {g.net > 0 ? "you are owed " : "you owe "}
                            {formatCurrency(Math.abs(g.net), g.currency)}
                          </span>
                        </Link>
                      ))}
                    <Link href="/settlements" className="block text-right text-sm text-green-600 hover:text-green-700 mt-2">
                      Settle up →
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Expenses */}
              <div className="bg-white rounded-2xl shadow-lg">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-display font-semibold text-gray-900">
                      Recent Expenses
                    </h2>
                    <Link
                      href="/expenses"
                      className="text-green-600 hover:text-green-500 font-medium text-sm font-body"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {expenses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🎉</span>
                      </div>
                      <h3 className="text-lg font-display font-medium text-gray-900 mb-2">
                        You&apos;re all set!
                      </h3>
                      <p className="text-gray-600 font-body mb-4">
                        Start by creating your first expense or group.
                      </p>
                      <Link
                        href="/expenses/create"
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add Expense
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              <span className="text-lg">
                                {CATEGORY_ICONS[expense.category] || "📦"}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 font-body">
                                {expense.description}
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>{formatDate(expense.date)}</span>
                                {expense.group && (
                                  <>
                                    <span>•</span>
                                    <span>{expense.group.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 font-body">
                              {formatCurrency(expense.amount, expense.group?.currency)}
                            </p>
                            {expense.my && expense.my.net !== 0 && (
                              <p className={`text-xs ${expense.my.net > 0 ? "text-green-600" : "text-red-600"}`}>
                                {expense.my.net > 0 ? "you lent " : "you borrowed "}
                                {formatCurrency(Math.abs(expense.my.net), expense.group?.currency)}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              {expense.payers.length > 1 ? `${expense.payers.length} payers` : 'Single payer'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-display font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <Link
                    href="/expenses/create"
                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Add New Expense
                  </Link>
                  <Link
                    href="/groups/create"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Create Group
                  </Link>
                  <Link
                    href="/settlements"
                    className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Settle Up
                  </Link>
                </div>
              </div>

              {/* Your Groups */}
              <div className="bg-white rounded-2xl shadow-lg">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-display font-semibold text-gray-900">
                      Your Groups
                    </h2>
                    <Link
                      href="/groups"
                      className="text-green-600 hover:text-green-500 font-medium text-sm font-body"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {groups.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-lg">👥</span>
                      </div>
                      <p className="text-gray-600 font-body mb-3">
                        No groups yet
                      </p>
                      <Link
                        href="/groups/create"
                        className="text-green-600 hover:text-green-500 font-medium text-sm font-body"
                      >
                        Create your first group
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groups.slice(0, 3).map((group) => (
                        <Link
                          key={group.id}
                          href={`/groups/${group.id}`}
                          className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900 font-body">
                                {group.name}
                              </h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  {group.memberStatusCount ? (
                                    <>
                                      {group.memberStatusCount.active} active
                                      {group.memberStatusCount.invited > 0 && (
                                        <span className="text-yellow-600">
                                          {" "}• {group.memberStatusCount.invited} pending
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    `${group._count.members} members`
                                  )}
                                  {" "}• {group._count.expenses} expenses
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {(() => {
                                const g = balances?.groups.find((x) => x.id === group.id);
                                if (!g || g.net === 0) return group.currency;
                                return `${g.net > 0 ? "+" : "-"}${formatCurrency(Math.abs(g.net), g.currency)}`;
                              })()}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
