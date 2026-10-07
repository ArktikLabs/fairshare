"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

interface Group {
  id: string;
  name: string;
  currency: string;
  memberStatusCount?: { active: number; invited: number };
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

/**
 * Entry point for "Add expense". Shared expenses always belong to a group
 * (that is where balances and settle-up live), so picking a group hands off
 * to the full group form. Without a group the expense is a personal record.
 */
export default function CreateExpense() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [personal, setPersonal] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/expenses/create");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const res = await fetch("/api/groups");
        if (res.ok) setGroups(await res.json());
      } finally {
        setLoadingGroups(false);
      }
    })();
  }, [session?.user?.id]);

  const submitPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    const value = parseFloat(amount);
    if (!description.trim()) return setError("Description is required");
    if (!value || value <= 0) return setError("Amount must be greater than 0");

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: value,
          category,
          date,
          notes: notes.trim() || undefined,
          splitMethod: "EQUAL",
          payers: [{ userId: session.user.id, amountPaid: value }],
          participants: [{ userId: session.user.id }],
        }),
      });
      const data = await res.json();
      if (res.ok) router.push("/expenses");
      else setError(data.error || "Failed to create expense");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader active="/expenses" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Add an expense</h1>
        <p className="text-gray-600 mb-6">Pick the group you shared it with.</p>

        {!personal && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
            {loadingGroups ? (
              <p className="text-gray-500">Loading your groups...</p>
            ) : groups.length === 0 ? (
              <div className="text-gray-600">
                You are not in any group yet.{" "}
                <Link href="/groups/create" className="text-blue-600 hover:text-blue-800">
                  Create a group
                </Link>{" "}
                to split expenses with others.
              </div>
            ) : (
              groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}/expenses/create`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                >
                  <span className="font-medium text-gray-900">{g.name}</span>
                  <span className="text-sm text-gray-500">{g.currency} →</span>
                </Link>
              ))
            )}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
              <Link href="/groups/create" className="text-blue-600 hover:text-blue-800">
                + New group
              </Link>
              <button onClick={() => setPersonal(true)} className="text-gray-600 hover:text-gray-900">
                Personal expense (not shared)
              </button>
            </div>
          </div>
        )}

        {personal && (
          <form onSubmit={submitPersonal} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="text-sm text-gray-500">
              Personal expenses are only a record for you. To split a cost, add it to a group.
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
            )}
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Amount</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPersonal(false)} className="px-4 py-2 text-gray-600">
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save expense"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
