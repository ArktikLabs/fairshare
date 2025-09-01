"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatCurrency } from "../../../../lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Group {
  id: string;
  name: string;
  currency: string;
  members: Array<{
    id: string;
    user: User;
    role: string;
  }>;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  payers: Array<{
    userId: string;
    amountPaid: number;
  }>;
  splits: Array<{
    userId: string;
    amount: number;
  }>;
}

const EXPENSE_CATEGORIES = [
  { value: 'FOOD_DRINK', label: '🍽️ Food & Drink' },
  { value: 'TRANSPORTATION', label: '🚗 Transportation' },
  { value: 'ACCOMMODATION', label: '🏨 Accommodation' },
  { value: 'ENTERTAINMENT', label: '🎬 Entertainment' },
  { value: 'SHOPPING', label: '🛍️ Shopping' },
  { value: 'UTILITIES', label: '⚡ Utilities' },
  { value: 'HEALTHCARE', label: '🏥 Healthcare' },
  { value: 'OTHER', label: '📦 Other' },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function GroupExpensesPage({ params }: Props) {
  const { data: session } = useSession();
  const [groupId, setGroupId] = useState<string>("");
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Get group ID from params
  useEffect(() => {
    async function getGroupId() {
      const resolvedParams = await params;
      setGroupId(resolvedParams.id);
    }
    getGroupId();
  }, [params]);

  // Fetch group and expenses data
  useEffect(() => {
    if (!groupId || !session?.user?.email) return;

    async function fetchData() {
      try {
        // Fetch group
        const groupResponse = await fetch(`/api/groups/${groupId}`);
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroup(groupData);
          
          // Find current user
          const currentUser = groupData.members.find((m: { id: string; user: { id: string; email: string | null }; role: string }) => m.user.email === session?.user?.email);
          if (currentUser) {
            setCurrentUserId(currentUser.user.id);
          }
        }

        // Fetch expenses
        const expensesResponse = await fetch(`/api/expenses?groupId=${groupId}`);
        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          setExpenses(expensesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [groupId, session?.user?.email]);

  // Filter expenses based on search and category
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate user's role in each expense
  const getUserRole = (expense: Expense) => {
    const isPayer = expense.payers.some(p => p.userId === currentUserId);
    const isSplit = expense.splits.some(s => s.userId === currentUserId);
    
    if (isPayer && isSplit) return "paid & owes";
    if (isPayer) return "paid";
    if (isSplit) return "owes";
    return "not involved";
  };

  // Calculate user's balance for an expense
  const getUserBalance = (expense: Expense) => {
    const amountPaid = expense.payers
      .filter(p => p.userId === currentUserId)
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);
    
    const amountOwed = expense.splits
      .filter(s => s.userId === currentUserId)
      .reduce((sum, s) => sum + Number(s.amount), 0);
    
    return amountPaid - amountOwed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h1>
          <p className="text-gray-600 mb-6">The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
            <span>→</span>
            <Link href={`/groups/${group.id}`} className="hover:text-gray-700">{group.name}</Link>
            <span>→</span>
            <span>Expenses</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group.name} Expenses</h1>
              <p className="text-gray-600 mt-1">{filteredExpenses.length} expenses found</p>
            </div>
            <Link
              href={`/groups/${group.id}/expenses/create`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expense
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search expenses
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description or notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory ? "No expenses match your filters" : "No expenses yet"}
            </p>
            <Link
              href={`/groups/${group.id}/expenses/create`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Add your first expense
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map(expense => {
              const userRole = getUserRole(expense);
              const userBalance = getUserBalance(expense);
              const categoryLabel = EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category;
              
              return (
                <div key={expense.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{expense.description}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {categoryLabel}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          userRole === "paid" ? "bg-green-100 text-green-600" :
                          userRole === "owes" ? "bg-red-100 text-red-600" :
                          userRole === "paid & owes" ? "bg-yellow-100 text-yellow-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {userRole}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>
                          Date: {new Date(expense.date).toLocaleDateString()}
                        </div>
                        <div>
                          Paid by: {expense.payers.map(payer => {
                            const member = group.members.find(m => m.user.id === payer.userId);
                            return member?.user.name || member?.user.email || "Unknown";
                          }).join(", ")}
                        </div>
                        <div>
                          Split between: {expense.splits.map(split => {
                            const member = group.members.find(m => m.user.id === split.userId);
                            return member?.user.name || member?.user.email || "Unknown";
                          }).join(", ")}
                        </div>
                        {expense.notes && (
                          <div className="text-gray-600">
                            Note: {expense.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="font-medium text-gray-900 mb-1">
                        {formatCurrency(Number(expense.amount), group.currency)}
                      </div>
                      {userBalance !== 0 && (
                        <div className={`text-sm ${
                          userBalance > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {userBalance > 0 ? "+" : ""}{formatCurrency(userBalance, group.currency)}
                        </div>
                      )}
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
