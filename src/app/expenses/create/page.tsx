"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

interface ExpensePayer {
  userId: string;
  amount: number;
}

interface ExpenseSplit {
  userId: string;
  amount?: number;
  percentage?: number;
  splitType: "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE" | "ADJUST";
}

interface ExpenseItem {
  name: string;
  amount: number;
  splits: Array<{
    userId: string;
    amount?: number;
    percentage?: number;
    splitType: "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE";
  }>;
}

const EXPENSE_CATEGORIES = [
  { value: "FOOD_DRINK", label: "🍽️ Food & Drink" },
  { value: "TRANSPORTATION", label: "🚗 Transportation" },
  { value: "ACCOMMODATION", label: "🏨 Accommodation" },
  { value: "ENTERTAINMENT", label: "🎬 Entertainment" },
  { value: "SHOPPING", label: "🛍️ Shopping" },
  { value: "UTILITIES", label: "⚡ Utilities" },
  { value: "HEALTHCARE", label: "🏥 Healthcare" },
  { value: "EDUCATION", label: "📚 Education" },
  { value: "TRAVEL", label: "✈️ Travel" },
  { value: "OTHER", label: "📦 Other" },
];

export default function CreateExpense() {
  const router = useRouter();
  const { data: session } = useSession();

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState("");
  const [isItemized, setIsItemized] = useState(false);

  // Advanced options
  const [payers, setPayers] = useState<ExpensePayer[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load user's groups
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchGroups = async () => {
      try {
        const response = await fetch("/api/groups");
        if (response.ok) {
          const data = await response.json();
          setGroups(data.groups || []);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };

    fetchGroups();
  }, [session?.user?.id]);

  // Update selected group when groupId changes
  useEffect(() => {
    const group = groups.find((g) => g.id === groupId);
    setSelectedGroup(group || null);

    // Initialize splits with equal distribution for all members
    if (group && group.members.length > 0) {
      const equalSplits = group.members.map((member) => ({
        userId: member.user.id,
        splitType: "EQUAL" as const,
      }));
      setSplits(equalSplits);

      // Initialize with current user as single payer
      if (session?.user?.id) {
        setPayers([{ userId: session.user.id, amount: 0 }]);
      }
    }
  }, [groupId, groups, session?.user?.id]);

  const addItem = () => {
    setItems([
      ...items,
      {
        name: "",
        amount: 0,
        splits:
          selectedGroup?.members.map((member) => ({
            userId: member.user.id,
            splitType: "EQUAL" as const,
          })) || [],
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof ExpenseItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const updatePayer = (
    index: number,
    field: keyof ExpensePayer,
    value: string | number
  ) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    setPayers(newPayers);
  };

  const addPayer = () => {
    setPayers([...payers, { userId: "", amount: 0 }]);
  };

  const removePayer = (index: number) => {
    setPayers(payers.filter((_, i) => i !== index));
  };

  const updateSplit = (
    index: number,
    field: keyof ExpenseSplit,
    value: string | number
  ) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const calculateTotalPaidAmount = () => {
    return payers.reduce((sum, payer) => sum + (payer.amount || 0), 0);
  };

  const calculateTotalItemsAmount = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      setError("You must be logged in to create an expense");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    const expenseAmount = isItemized
      ? calculateTotalItemsAmount()
      : parseFloat(amount);

    if (!expenseAmount || expenseAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (showAdvanced) {
      const totalPaid = calculateTotalPaidAmount();
      if (Math.abs(totalPaid - expenseAmount) > 0.01) {
        setError(
          `Total paid amount (${totalPaid.toFixed(
            2
          )}) must equal expense amount (${expenseAmount.toFixed(2)})`
        );
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const expenseData = {
        description: description.trim(),
        amount: expenseAmount,
        category,
        notes: notes.trim() || undefined,
        groupId: groupId || undefined,
        date: new Date().toISOString(),
        isItemized,
        payers: showAdvanced
          ? payers
          : [{ userId: session.user.id, amount: expenseAmount }],
        splits:
          splits.length > 0
            ? splits
            : [{ userId: session.user.id, splitType: "EQUAL" }],
        items: isItemized ? items : undefined,
      };

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Failed to create expense");
      }
    } catch (err) {
      console.error("Error creating expense:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Create New Expense
          </h1>
          <p className="text-gray-600 mt-2 font-body">
            Add a new expense to split with your group or track personally
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-body">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 font-display">
                Basic Information
              </h2>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2 font-body"
                >
                  Description *
                </label>
                <input
                  id="description"
                  type="text"
                  required
                  placeholder="e.g., Dinner at restaurant, Taxi ride, Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isItemized && (
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700 mb-2 font-body"
                    >
                      Amount *
                    </label>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required={!isItemized}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                      disabled={loading || isItemized}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-2 font-body"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                    disabled={loading}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="group"
                  className="block text-sm font-medium text-gray-700 mb-2 font-body"
                >
                  Group (optional)
                </label>
                <select
                  id="group"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                  disabled={loading}
                >
                  <option value="">Personal expense (no group)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-2 font-body"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Additional details about this expense..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Itemized Expenses Toggle */}
            <div className="border-t pt-6">
              <div className="flex items-center space-x-3">
                <input
                  id="itemized"
                  type="checkbox"
                  checked={isItemized}
                  onChange={(e) => setIsItemized(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label
                  htmlFor="itemized"
                  className="text-sm font-medium text-gray-700 font-body"
                >
                  Itemized expense (split individual items differently)
                </label>
              </div>
            </div>

            {/* Itemized Items */}
            {isItemized && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-900 font-display">
                    Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    disabled={loading}
                  >
                    Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 font-body">
                        Item {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-body"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) =>
                          updateItem(index, "name", e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                        disabled={loading}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={item.amount || ""}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                        disabled={loading}
                      />
                    </div>
                  </div>
                ))}

                {items.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 font-body">
                      Total items amount:{" "}
                      <span className="font-semibold">
                        ${calculateTotalItemsAmount().toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Options */}
            {selectedGroup && (
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 font-body"
                  disabled={loading}
                >
                  <span>{showAdvanced ? "▼" : "▶"}</span>
                  <span>Advanced: Custom payers and splits</span>
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-6">
                    {/* Payers Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-semibold text-gray-900 font-display">
                          Who paid?
                        </h3>
                        <button
                          type="button"
                          onClick={addPayer}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          disabled={loading}
                        >
                          Add Payer
                        </button>
                      </div>

                      {payers.map((payer, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 mb-2"
                        >
                          <select
                            value={payer.userId}
                            onChange={(e) =>
                              updatePayer(index, "userId", e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                            disabled={loading}
                          >
                            <option value="">Select member</option>
                            {selectedGroup.members.map((member) => (
                              <option
                                key={member.user.id}
                                value={member.user.id}
                              >
                                {member.user.name || member.user.email}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Amount paid"
                            value={payer.amount || ""}
                            onChange={(e) =>
                              updatePayer(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                            disabled={loading}
                          />
                          {payers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePayer(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-body"
                              disabled={loading}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 font-body">
                          Total paid:{" "}
                          <span className="font-semibold">
                            ${calculateTotalPaidAmount().toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Splits Section */}
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-3 font-display">
                        How to split the cost?
                      </h3>

                      {splits.map((split, index) => {
                        const member = selectedGroup.members.find(
                          (m) => m.user.id === split.userId
                        );
                        return (
                          <div
                            key={index}
                            className="flex items-center space-x-3 mb-2"
                          >
                            <span className="flex-1 px-3 py-2 bg-gray-50 rounded-lg font-body">
                              {member
                                ? member.user.name || member.user.email
                                : "Unknown member"}
                            </span>
                            <select
                              value={split.splitType}
                              onChange={(e) =>
                                updateSplit(index, "splitType", e.target.value)
                              }
                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                              disabled={loading}
                            >
                              <option value="EQUAL">Equal</option>
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="EXACT">Fixed Amount</option>
                              <option value="SHARE">Share</option>
                              <option value="ADJUSTMENT">Adjustment</option>
                            </select>
                            {split.splitType === "PERCENTAGE" && (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100%"
                                value={split.percentage || ""}
                                onChange={(e) =>
                                  updateSplit(
                                    index,
                                    "percentage",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                                disabled={loading}
                              />
                            )}
                            {split.splitType === "EXACT" && (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Amount"
                                value={split.amount || ""}
                                onChange={(e) =>
                                  updateSplit(
                                    index,
                                    "amount",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-body"
                                disabled={loading}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-body"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
                >
                  {loading ? "Creating..." : "Create Expense"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
