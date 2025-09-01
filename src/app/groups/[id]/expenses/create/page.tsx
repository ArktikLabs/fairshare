"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  members: Array<{
    id: string;
    user: User;
    role: string;
  }>;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  type: "member" | "invitation";
}

interface InvitationData {
  email: string;
}

interface ExpensePayer {
  userId?: string;
  email?: string;
  amount: number;
}

interface ExpenseSplit {
  userId?: string;
  email?: string;
  amount?: number;
  percentage?: number;
  splitType: "EQUAL" | "PERCENTAGE" | "FIXED_AMOUNT";
}

const EXPENSE_CATEGORIES = [
  { value: "FOOD_DRINK", label: "🍽️ Food & Drink" },
  { value: "TRANSPORTATION", label: "🚗 Transportation" },
  { value: "ACCOMMODATION", label: "🏨 Accommodation" },
  { value: "ENTERTAINMENT", label: "🎬 Entertainment" },
  { value: "SHOPPING", label: "🛍️ Shopping" },
  { value: "UTILITIES", label: "⚡ Utilities" },
  { value: "HEALTHCARE", label: "🏥 Healthcare" },
  { value: "OTHER", label: "📦 Other" },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function CreateGroupExpensePage({ params }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [groupId, setGroupId] = useState<string>("");
  const [group, setGroup] = useState<Group | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("FOOD_DRINK");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Simple expense state
  const [payers, setPayers] = useState<ExpensePayer[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [splitMethod, setSplitMethod] = useState<
    "EQUAL" | "PERCENTAGE" | "FIXED_AMOUNT"
  >("EQUAL");

  // Get group ID from params
  useEffect(() => {
    async function getGroupId() {
      const resolvedParams = await params;
      setGroupId(resolvedParams.id);
    }
    getGroupId();
  }, [params]);

  // Fetch group data and invitations
  useEffect(() => {
    if (!groupId) return;

    async function fetchGroup() {
      try {
        // Fetch group data
        const groupResponse = await fetch(`/api/groups/${groupId}`);
        if (!groupResponse.ok) {
          throw new Error("Failed to fetch group");
        }
        const groupData = await groupResponse.json();
        setGroup(groupData);

        // Fetch group invitations
        const invitationsResponse = await fetch(
          `/api/groups/${groupId}/invitations`
        );
        let invitationsData = [];
        if (invitationsResponse.ok) {
          invitationsData = await invitationsResponse.json();
        }

        // Include both active/invited members AND pending invitations
        const memberParticipants = groupData.members
          .filter((member: any) => member.status === "ACTIVE" || member.status === "INVITED")
          .map((member: { id: string; user: User; role: string; status: string }) => ({
            id: member.user.id,
            name: member.user.name || member.user.email || "",
            email: member.user.email || "",
            type: "member" as const,
            status: member.status
          }));

        // Add invitation-only users (not yet registered members)
        const invitationParticipants = invitationsData
          .filter((invitation: any) => 
            // Only include invitations for emails not already registered as members
            !memberParticipants.find(m => m.email === invitation.email)
          )
          .map((invitation: any) => ({
            id: invitation.email, // Use email as ID for invitations
            name: invitation.email,
            email: invitation.email,
            type: "invitation" as const
          }));

        // Combine both lists
        const participants: Participant[] = [
          ...memberParticipants,
          ...invitationParticipants
        ];
        setAllParticipants(participants);

        // Initialize with current user as payer and participant
        if (session?.user?.email) {
          const currentUser = groupData.members.find(
            (m: { id: string; user: User; role: string }) =>
              m.user.email === session.user.email && m.status === "ACTIVE"
          );
          if (currentUser) {
            setPayers([{ userId: currentUser.user.id, amount: 0 }]);
            // Initialize with current user selected as participant
            setSelectedParticipants(new Set([currentUser.user.id]));
            setSplits([{
              userId: currentUser.user.id,
              splitType: "EQUAL" as const,
              amount: 0
            }]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchGroup();
  }, [groupId, session?.user?.email]);

  // Update splits when participants change
  useEffect(() => {
    const newSplits = Array.from(selectedParticipants).map(participantId => {
      const participant = allParticipants.find(p => p.id === participantId);
      if (!participant) return null;
      
      return participant.type === "member"
        ? {
            userId: participant.id,
            splitType: splitMethod,
            amount: 0,
            percentage: splitMethod === "PERCENTAGE" ? 100 / selectedParticipants.size : undefined
          }
        : {
            email: participant.email,
            splitType: splitMethod,
            amount: 0,
            percentage: splitMethod === "PERCENTAGE" ? 100 / selectedParticipants.size : undefined
          };
    }).filter(Boolean);
    setSplits(newSplits);
  }, [selectedParticipants, splitMethod, allParticipants]);

  // Auto-calculate equal splits when amount changes
  useEffect(() => {
    if (splitMethod === "EQUAL" && amount && splits.length > 0) {
      const totalAmount = parseFloat(amount);
      const equalAmount = totalAmount / splits.length;
      setSplits((prev) =>
        prev.map((split) => ({
          ...split,
          amount: equalAmount,
        }))
      );
    }
  }, [amount, splits.length, splitMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !session?.user?.email) return;

    setSubmitting(true);

    try {
      const expenseData = {
        description,
        amount: parseFloat(amount),
        category,
        date,
        notes,
        groupId: group.id,
        splitMethod,
        payers: payers.map((p) => ({
          ...(p.userId ? { userId: p.userId } : { email: p.email }),
          amountPaid: p.amount,
        })),
        participants: splits.map((s) => ({
          ...(s.userId ? { userId: s.userId } : { email: s.email }),
          amount: s.amount,
          percentage: s.percentage,
          shares: s.splitType === "EQUAL" ? 1 : undefined,
        })),
      };

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        router.push(`/groups/${group.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create expense");
      }
    } catch (error) {
      console.error("Error creating expense:", error);
      alert("An error occurred while creating the expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Group not found
          </h1>
          <p className="text-gray-600 mb-6">
            The group you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>→</span>
            <Link href={`/groups/${group.id}`} className="hover:text-gray-700">
              {group.name}
            </Link>
            <span>→</span>
            <span>Add Expense</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Expense to {group.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Add a new expense to share with group members
          </p>
        </div>

        {/* Expense Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({group.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about this expense"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Participants Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Who participated in this expense?
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {allParticipants.map((participant) => (
                  <label key={participant.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.has(participant.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedParticipants);
                        if (e.target.checked) {
                          newSelected.add(participant.id);
                        } else {
                          newSelected.delete(participant.id);
                        }
                        setSelectedParticipants(newSelected);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{participant.name}</span>
                        {participant.type === "invitation" && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Invited
                          </span>
                        )}
                        {participant.type === "member" && (participant as any).status === "INVITED" && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{participant.email}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedParticipants.size === 0 && (
                <p className="text-sm text-red-600 mt-2">Please select at least one participant.</p>
              )}
            </div>

            {/* Who Paid Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Who paid for this expense?
              </label>
              <div className="space-y-2">
                {payers.map((payer, index) => {
                  const participant = allParticipants.find(
                    (p) =>
                      (payer.userId && p.id === payer.userId) ||
                      (payer.email && p.email === payer.email)
                  );
                  return (
                    <div
                      key={payer.userId || payer.email}
                      className="flex items-center space-x-3"
                    >
                      <span className="flex-1 text-sm text-gray-900">
                        {participant?.name}{" "}
                        {participant?.type === "invitation" && "(invited)"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payer.amount}
                        onChange={(e) => {
                          const newPayers = [...payers];
                          newPayers[index].amount =
                            parseFloat(e.target.value) || 0;
                          setPayers(newPayers);
                        }}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                      {payers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayers(payers.filter((_, i) => i !== index));
                          }}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {payers.length < selectedParticipants.size && (
                <div className="mt-3">
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const participant = allParticipants.find(
                          (p) => p.id === selectedId
                        );
                        if (participant && selectedParticipants.has(participant.id)) {
                          const newPayer = participant.type === "member"
                            ? { userId: participant.id, amount: 0 }
                            : { email: participant.email, amount: 0 };
                          setPayers([
                            ...payers,
                            newPayer,
                          ]);
                        }
                        e.target.value = "";
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Add another payer...</option>
                    {allParticipants
                      .filter(
                        (participant) =>
                          selectedParticipants.has(participant.id) &&
                          !payers.find(
                            (p) => 
                              (p.userId && p.userId === participant.id) ||
                              (p.email && p.email === participant.email)
                          )
                      )
                      .map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* How to Split Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How should this be split?
              </label>

              {/* Split Method Selection */}
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="EQUAL"
                    checked={splitMethod === "EQUAL"}
                    onChange={(e) =>
                      setSplitMethod(
                        e.target.value as
                          | "EQUAL"
                          | "PERCENTAGE"
                          | "FIXED_AMOUNT"
                      )
                    }
                    className="mr-2"
                  />
                  Equal split
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PERCENTAGE"
                    checked={splitMethod === "PERCENTAGE"}
                    onChange={(e) =>
                      setSplitMethod(
                        e.target.value as
                          | "EQUAL"
                          | "PERCENTAGE"
                          | "FIXED_AMOUNT"
                      )
                    }
                    className="mr-2"
                  />
                  By percentage
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="FIXED_AMOUNT"
                    checked={splitMethod === "FIXED_AMOUNT"}
                    onChange={(e) =>
                      setSplitMethod(
                        e.target.value as
                          | "EQUAL"
                          | "PERCENTAGE"
                          | "FIXED_AMOUNT"
                      )
                    }
                    className="mr-2"
                  />
                  Custom amounts
                </label>
              </div>

              {/* Split Details */}
              <div className="space-y-2">
                {splits.map((split, index) => {
                  const participant = allParticipants.find(
                    (p) =>
                      (split.userId && p.id === split.userId) ||
                      (split.email && p.email === split.email)
                  );
                  return (
                    <div
                      key={split.userId || split.email}
                      className="flex items-center space-x-3"
                    >
                      <span className="flex-1 text-sm text-gray-900">
                        {participant?.name}{" "}
                        {participant?.type === "invitation" && "(invited)"}
                      </span>

                      {splitMethod === "EQUAL" && (
                        <span className="text-sm text-gray-500">
                          {amount
                            ? `${group.currency} ${(
                                parseFloat(amount) / splits.length
                              ).toFixed(2)}`
                            : "Equal share"}
                        </span>
                      )}

                      {splitMethod === "PERCENTAGE" && (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={split.percentage || 0}
                            onChange={(e) => {
                              const newSplits = [...splits];
                              newSplits[index].percentage =
                                parseFloat(e.target.value) || 0;
                              newSplits[index].amount = amount
                                ? (parseFloat(amount) *
                                    (newSplits[index].percentage || 0)) /
                                  100
                                : 0;
                              setSplits(newSplits);
                            }}
                            className="w-16 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      )}

                      {splitMethod === "FIXED_AMOUNT" && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={split.amount || 0}
                          onChange={(e) => {
                            const newSplits = [...splits];
                            newSplits[index].amount =
                              parseFloat(e.target.value) || 0;
                            setSplits(newSplits);
                          }}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0.00"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                href={`/groups/${group.id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !description || !amount || selectedParticipants.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Creating..." : "Create Expense"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
