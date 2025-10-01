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
  share?: number;
  adjustment?: number;
  splitType: "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE" | "ADJUSTMENT";
}

interface ItemParticipantSplit {
  userId?: string;
  email?: string;
  participantId: string;
  isIncluded: boolean;
  amount?: number;
  percentage?: number;
  shares?: number;
}

type ItemSplitMethod = "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE";

interface ItemFormState {
  id: string;
  name: string;
  amount: number;
  splitMethod: ItemSplitMethod;
  participants: ItemParticipantSplit[];
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
  const [isItemized, setIsItemized] = useState(false);
  const [items, setItems] = useState<ItemFormState[]>([]);

  // Simple expense state
  const [payers, setPayers] = useState<ExpensePayer[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set()
  );
  const [splitMethod, setSplitMethod] = useState<
    "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE" | "ADJUSTMENT"
  >("EQUAL");

  const generateItemId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const itemTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const displayedAmount = isItemized
    ? itemTotal > 0
      ? itemTotal.toFixed(2)
      : ""
    : amount;

  const buildItemParticipants = (): ItemParticipantSplit[] => {
    return Array.from(selectedParticipants)
      .map((participantId) => {
        const participant = allParticipants.find((p) => p.id === participantId);
        if (!participant) {
          return null;
        }

        if (participant.type === "member") {
          return {
            participantId: participant.id,
            userId: participant.id,
            isIncluded: true,
            amount: 0,
          } as ItemParticipantSplit;
        }

        return {
          participantId: participant.id,
          email: participant.email,
          isIncluded: true,
          amount: 0,
        } as ItemParticipantSplit;
      })
      .filter(
        (participant): participant is ItemParticipantSplit => participant !== null
      );
  };

  const recalculateItemSplits = (item: ItemFormState): ItemFormState => {
    const updatedParticipants = item.participants.map((participant) => ({
      ...participant,
    }));
    const included = updatedParticipants.filter((participant) => participant.isIncluded);

    if (included.length === 0) {
      return {
        ...item,
        participants: updatedParticipants.map((participant) => ({
          ...participant,
          amount: 0,
          percentage: undefined,
          shares: undefined,
        })),
      };
    }

    switch (item.splitMethod) {
      case "EQUAL": {
        const equalAmount = item.amount > 0 ? item.amount / included.length : 0;
        const recalculated = updatedParticipants.map((participant) =>
          participant.isIncluded
            ? {
                ...participant,
                amount: equalAmount,
                percentage: undefined,
                shares: undefined,
              }
            : {
                ...participant,
                amount: 0,
                percentage: undefined,
                shares: undefined,
              }
        );
        return { ...item, participants: recalculated };
      }
      case "PERCENTAGE": {
        const defaultPercentage = 100 / included.length;
        const recalculated = updatedParticipants.map((participant) => {
          if (!participant.isIncluded) {
            return {
              ...participant,
              amount: 0,
              percentage: undefined,
              shares: undefined,
            };
          }

          const percentage =
            participant.percentage !== undefined
              ? participant.percentage
              : defaultPercentage;

          return {
            ...participant,
            percentage,
            shares: undefined,
            amount: item.amount > 0 ? (item.amount * percentage) / 100 : 0,
          };
        });
        return { ...item, participants: recalculated };
      }
      case "EXACT": {
        const recalculated = updatedParticipants.map((participant) =>
          participant.isIncluded
            ? {
                ...participant,
                amount: participant.amount || 0,
                percentage: undefined,
                shares: undefined,
              }
            : {
                ...participant,
                amount: 0,
                percentage: undefined,
                shares: undefined,
              }
        );
        return { ...item, participants: recalculated };
      }
      case "SHARE": {
        const defaultShare = 1;
        const totalShares = updatedParticipants.reduce((sum, participant) => {
          if (!participant.isIncluded) {
            return sum;
          }
          return sum + (participant.shares || defaultShare);
        }, 0);
        const shareDenominator =
          totalShares > 0 ? totalShares : included.length * defaultShare;
        const recalculated = updatedParticipants.map((participant) => {
          if (!participant.isIncluded) {
            return {
              ...participant,
              amount: 0,
              percentage: undefined,
              shares: undefined,
            };
          }

          const shares = participant.shares || defaultShare;

          return {
            ...participant,
            shares,
            percentage: undefined,
            amount:
              item.amount > 0 && shareDenominator > 0
                ? (item.amount * shares) / shareDenominator
                : 0,
          };
        });
        return { ...item, participants: recalculated };
      }
      default:
        return item;
    }
  };

  const createNewItem = (): ItemFormState => {
    const participants = buildItemParticipants();
    const baseItem: ItemFormState = {
      id: generateItemId(),
      name: "",
      amount: 0,
      splitMethod: "EQUAL",
      participants,
    };
    return recalculateItemSplits(baseItem);
  };

  const addItem = () => {
    setItems((prev) => [...prev, createNewItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItemName = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: value };
      return next;
    });
  };

  const updateItemAmount = (index: number, value: number) => {
    setItems((prev) => {
      const next = [...prev];
      const updatedItem = { ...next[index], amount: value };
      next[index] = recalculateItemSplits(updatedItem);
      return next;
    });
  };

  const updateItemSplitMethod = (index: number, method: ItemSplitMethod) => {
    setItems((prev) => {
      const next = [...prev];
      const updatedItem: ItemFormState = {
        ...next[index],
        splitMethod: method,
        participants: next[index].participants.map((participant) => ({
          ...participant,
        })),
      };
      next[index] = recalculateItemSplits(updatedItem);
      return next;
    });
  };

  const toggleItemParticipant = (
    itemIndex: number,
    participantId: string,
    isIncluded: boolean
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const updatedItem: ItemFormState = {
        ...next[itemIndex],
        participants: next[itemIndex].participants.map((participant) => {
          if (participant.participantId !== participantId) {
            return { ...participant };
          }

          return {
            ...participant,
            isIncluded,
            amount: isIncluded ? participant.amount || 0 : 0,
            percentage: isIncluded ? participant.percentage : undefined,
            shares: isIncluded ? participant.shares : undefined,
          };
        }),
      };
      next[itemIndex] = recalculateItemSplits(updatedItem);
      return next;
    });
  };

  const updateItemParticipantValue = (
    itemIndex: number,
    participantId: string,
    field: "amount" | "percentage" | "shares",
    value: number
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const updatedItem: ItemFormState = {
        ...next[itemIndex],
        participants: next[itemIndex].participants.map((participant) => {
          if (participant.participantId !== participantId) {
            return { ...participant };
          }

          if (field === "shares") {
            return { ...participant, shares: value };
          }

          if (field === "percentage") {
            return { ...participant, percentage: value };
          }

          return { ...participant, amount: value };
        }),
      };
      next[itemIndex] = recalculateItemSplits(updatedItem);
      return next;
    });
  };

  const mapToApiSplitMethod = (
    method: "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARE" | "ADJUSTMENT"
  ): "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARES" => {
    if (method === "SHARE") return "SHARES";
    if (method === "ADJUSTMENT") return "EXACT";
    return method;
  };

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
          .filter(
            (member: any) =>
              member.status === "ACTIVE" || member.status === "INVITED"
          )
          .map(
            (member: {
              id: string;
              user: User;
              role: string;
              status: string;
            }) => ({
              id: member.user.id,
              name: member.user.name || member.user.email || "",
              email: member.user.email || "",
              type: "member" as const,
              status: member.status,
            })
          );

        // Add invitation-only users (not yet registered members)
        const invitationParticipants = invitationsData
          .filter(
            (invitation: any) =>
              // Only include invitations for emails not already registered as members
              !memberParticipants.find((m: any) => m.email === invitation.email)
          )
          .map((invitation: any) => ({
            id: invitation.email, // Use email as ID for invitations
            name: invitation.email,
            email: invitation.email,
            type: "invitation" as const,
          }));

        // Combine both lists
        const participants: Participant[] = [
          ...memberParticipants,
          ...invitationParticipants,
        ];
        setAllParticipants(participants);

        // Initialize with current user as payer and participant
        if (session?.user?.email) {
          const currentUser = groupData.members.find(
            (m: { id: string; user: User; role: string }) =>
              m.user.email === session.user.email && m.status === "ACTIVE"
          );
          if (currentUser) {
            setPayers([
              {
                userId: currentUser.user.id,
                amount: amount ? parseFloat(amount) : 0,
              },
            ]);
            // Initialize with current user selected as participant
            setSelectedParticipants(new Set([currentUser.user.id]));
            setSplits([
              {
                userId: currentUser.user.id,
                splitType: "EQUAL" as const,
                amount: 0,
              },
            ]);
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
    const newSplits = Array.from(selectedParticipants)
      .map((participantId) => {
        const participant = allParticipants.find((p) => p.id === participantId);
        if (!participant) return null;

        return participant.type === "member"
          ? {
              userId: participant.id,
              splitType: splitMethod,
              amount: 0,
              percentage:
                splitMethod === "PERCENTAGE"
                  ? 100 / selectedParticipants.size
                  : undefined,
            }
          : {
              email: participant.email,
              splitType: splitMethod,
              amount: 0,
              percentage:
                splitMethod === "PERCENTAGE"
                  ? 100 / selectedParticipants.size
                  : undefined,
            };
      })
      .filter(Boolean);
    setSplits(newSplits);
  }, [selectedParticipants, splitMethod, allParticipants]);

  useEffect(() => {
    if (!isItemized) return;

    setItems((prevItems) => {
      if (prevItems.length === 0) {
        return prevItems;
      }

      return prevItems.map((item) => {
        const participantMap = new Map(
          item.participants.map((participant) => [
            participant.participantId,
            participant,
          ])
        );

        const updatedParticipants = Array.from(selectedParticipants)
          .map((participantId) => {
            const existingParticipant = participantMap.get(participantId);
            if (existingParticipant) {
              return { ...existingParticipant };
            }

            const participant = allParticipants.find((p) => p.id === participantId);
            if (!participant) {
              return null;
            }

            if (participant.type === "member") {
              return {
                participantId: participant.id,
                userId: participant.id,
                isIncluded: true,
                amount: 0,
              } as ItemParticipantSplit;
            }

            return {
              participantId: participant.id,
              email: participant.email,
              isIncluded: true,
              amount: 0,
            } as ItemParticipantSplit;
          })
          .filter(
            (participant): participant is ItemParticipantSplit =>
              participant !== null
          );

        return recalculateItemSplits({
          ...item,
          participants: updatedParticipants,
        });
      });
    });
  }, [selectedParticipants, allParticipants, isItemized]);

  // Auto-calculate equal splits when amount changes
  useEffect(() => {
    if (isItemized) return;

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

    if (splitMethod === "SHARE" && amount && splits.length > 0) {
      const totalShares: number = splits.reduce((accumulator, currentSplit) => {
        return accumulator + (currentSplit.share ? currentSplit.share : 1);
      }, 0);
      const totalAmount = parseFloat(amount);
      setSplits((prev) =>
        prev.map((split) => ({
          ...split,
          amount: (totalAmount * (split.share ? split.share : 1)) / totalShares,
        }))
      );
    }

    if (splitMethod === "ADJUSTMENT" && amount && splits.length > 0) {
      const totalShares: number = splits.reduce((accumulator, currentSplit) => {
        return accumulator + (currentSplit.share ? currentSplit.share : 1);
      }, 0);
      const totalAmount = parseFloat(amount);
      setSplits((prev) =>
        prev.map((split) => ({
          ...split,
          amount: (totalAmount * (split.share ? split.share : 1)) / totalShares,
        }))
      );
    }
  }, [amount, splits.length, splitMethod, isItemized]);

  // Auto-calculate payers amount when amount/payers changes
  useEffect(() => {
    if (payers.length === 0) return;

    const totalAmount = isItemized
      ? itemTotal
      : amount
      ? parseFloat(amount)
      : 0;

    if (totalAmount > 0) {
      const equalAmount = totalAmount / payers.length;
      setPayers((prev) =>
        prev.map((payer) => ({
          ...payer,
          amount: equalAmount,
        }))
      );
    } else {
      setPayers((prev) =>
        prev.map((payer) => ({
          ...payer,
          amount: 0,
        }))
      );
    }
  }, [payers.length, amount, isItemized, itemTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !session?.user?.email) return;

    setSubmitting(true);

    try {
      const totalAmount = isItemized
        ? itemTotal
        : amount
        ? parseFloat(amount)
        : 0;

      if (!totalAmount || totalAmount <= 0) {
        alert("Please enter a valid amount for the expense.");
        return;
      }

      let preparedItems:
        | {
            name: string;
            amount: number;
            isShared: boolean;
            splitMethod: "EQUAL" | "PERCENTAGE" | "EXACT" | "SHARES";
            participants: {
              userId?: string;
              email?: string;
              amount: number;
              percentage?: number;
              shares?: number;
            }[];
          }[]
        | undefined;

      if (isItemized) {
        if (items.length === 0) {
          alert("Add at least one item to continue.");
          return;
        }

        const validationErrors: string[] = [];

        preparedItems = items.map((item, index) => {
          const includedParticipants = item.participants.filter(
            (participant) => participant.isIncluded
          );

          if (!item.name.trim()) {
            validationErrors.push(`Item ${index + 1} needs a name.`);
          }

          if (!item.amount || item.amount <= 0) {
            validationErrors.push(
              `Item ${index + 1} must have an amount greater than 0.`
            );
          }

          if (includedParticipants.length === 0) {
            validationErrors.push(
              `Select at least one participant for item ${index + 1}.`
            );
          }

          if (item.splitMethod === "PERCENTAGE") {
            const totalPercentage = includedParticipants.reduce(
              (sum, participant) => sum + (participant.percentage || 0),
              0
            );
            if (Math.abs(totalPercentage - 100) > 0.5) {
              validationErrors.push(
                `Percentages for item ${index + 1} should total 100%.`
              );
            }
          }

          const participantsPayload = includedParticipants.map((participant) => {
            const participantPayload: {
              userId?: string;
              email?: string;
              amount: number;
              percentage?: number;
              shares?: number;
            } = {
              ...(participant.userId
                ? { userId: participant.userId }
                : { email: participant.email }),
              amount: participant.amount || 0,
            };

            if (item.splitMethod === "PERCENTAGE") {
              participantPayload.percentage = participant.percentage ?? 0;
            }

            if (item.splitMethod === "SHARE") {
              participantPayload.shares = participant.shares || 1;
            }

            return participantPayload;
          });

          return {
            name: item.name.trim() || `Item ${index + 1}`,
            amount: item.amount,
            isShared: includedParticipants.length > 1,
            splitMethod:
              item.splitMethod === "SHARE" ? "SHARES" : item.splitMethod,
            participants: participantsPayload,
          };
        });

        if (validationErrors.length > 0) {
          alert(validationErrors[0]);
          return;
        }
      }

      const normalizedPayers = payers.map((payer) => ({
        ...(payer.userId ? { userId: payer.userId } : { email: payer.email }),
        amountPaid: payer.amount,
      }));

      const expenseData = isItemized
        ? {
            description,
            amount: totalAmount,
            category,
            date,
            notes,
            groupId: group.id,
            payers: normalizedPayers,
            items: preparedItems!,
          }
        : {
            description,
            amount: totalAmount,
            category,
            date,
            notes,
            groupId: group.id,
            splitMethod: mapToApiSplitMethod(splitMethod),
            payers: normalizedPayers,
            participants: splits.map((split) => {
              const participantPayload: {
                userId?: string;
                email?: string;
                amount: number | undefined;
                percentage?: number;
                shares?: number;
              } = {
                ...(split.userId
                  ? { userId: split.userId }
                  : { email: split.email }),
                amount: split.amount ?? 0,
                percentage: split.percentage,
              };

              if (splitMethod === "SHARE") {
                participantPayload.shares = split.share ?? 1;
              }

              return participantPayload;
            }),
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
                  value={displayedAmount}
                  onChange={(e) => {
                    if (!isItemized) {
                      setAmount(e.target.value);
                    }
                  }}
                  placeholder={isItemized ? "Calculated from items" : "0.00"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!isItemized}
                  disabled={isItemized}
                />
                {isItemized && (
                  <p className="text-xs text-gray-500 mt-1">
                    Total is computed from itemized entries.
                  </p>
                )}
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
                  <label
                    key={participant.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
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
                        <span className="text-sm font-medium text-gray-900">
                          {participant.name}
                        </span>
                        {participant.type === "invitation" && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Invited
                          </span>
                        )}
                        {participant.type === "member" &&
                          (participant as any).status === "INVITED" && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Pending
                            </span>
                          )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {participant.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedParticipants.size === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Please select at least one participant.
                </p>
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
                        if (
                          participant &&
                          selectedParticipants.has(participant.id)
                        ) {
                          const newPayer =
                            participant.type === "member"
                              ? { userId: participant.id, amount: 0 }
                              : { email: participant.email, amount: 0 };
                          setPayers([...payers, newPayer]);
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  How should this be split?
                </span>
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="EQUAL"
                    checked={!isItemized && splitMethod === "EQUAL"}
                    onChange={() => {
                      setIsItemized(false);
                      setSplitMethod("EQUAL");
                    }}
                    className="mr-2"
                  />
                  Equal split
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="PERCENTAGE"
                    checked={!isItemized && splitMethod === "PERCENTAGE"}
                    onChange={() => {
                      setIsItemized(false);
                      setSplitMethod("PERCENTAGE");
                    }}
                    className="mr-2"
                  />
                  Percentages
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="EXACT"
                    checked={!isItemized && splitMethod === "EXACT"}
                    onChange={() => {
                      setIsItemized(false);
                      setSplitMethod("EXACT");
                    }}
                    className="mr-2"
                  />
                  Exact amounts
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="SHARE"
                    checked={!isItemized && splitMethod === "SHARE"}
                    onChange={() => {
                      setIsItemized(false);
                      setSplitMethod("SHARE");
                    }}
                    className="mr-2"
                  />
                  Shares
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="ADJUSTMENT"
                    checked={!isItemized && splitMethod === "ADJUSTMENT"}
                    onChange={() => {
                      setIsItemized(false);
                      setSplitMethod("ADJUSTMENT");
                    }}
                    className="mr-2"
                  />
                  Adjustment
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="split-mode"
                    value="ITEMIZED"
                    checked={isItemized}
                    onChange={() => setIsItemized(true)}
                    className="mr-2"
                  />
                  Itemized per item
                </label>
              </div>

              {isItemized ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Define items and customize splits for each line. Total updates automatically.
                  </p>

                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Items</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Item
                    </button>
                  </div>

                  {items.map((item, index) => {
                    const includedCount = item.participants.filter((participant) => participant.isIncluded).length;

                    return (
                      <div
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-semibold text-gray-900">
                            Item {index + 1}
                          </h5>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItemName(index, e.target.value)}
                            placeholder="Item name"
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amount ? item.amount : ""}
                            onChange={(e) =>
                              updateItemAmount(index, parseFloat(e.target.value) || 0)
                            }
                            placeholder="Item amount"
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Split method
                          </label>
                          <select
                            value={item.splitMethod}
                            onChange={(e) =>
                              updateItemSplitMethod(index, e.target.value as ItemSplitMethod)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="EQUAL">Equal</option>
                            <option value="PERCENTAGE">Percentage</option>
                            <option value="EXACT">Exact amount</option>
                            <option value="SHARE">Shares</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Participants</p>
                          {item.participants.map((participantSplit) => {
                            const participant = allParticipants.find(
                              (p) => p.id === participantSplit.participantId
                            );
                            const isIncluded = participantSplit.isIncluded;
                            const displayName =
                              participant?.name || participant?.email || "Unknown participant";

                            return (
                              <div
                                key={participantSplit.participantId}
                                className="bg-white border border-gray-200 rounded-lg p-3 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={isIncluded}
                                      onChange={(e) =>
                                        toggleItemParticipant(
                                          index,
                                          participantSplit.participantId,
                                          e.target.checked
                                        )
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-900">{displayName}</span>
                                    {participant?.type === "invitation" && (
                                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                        Invited
                                      </span>
                                    )}
                                  </label>
                                  {isIncluded && (
                                    <span className="text-sm text-gray-500">
                                      {group.currency}{" "}
                                      {(participantSplit.amount || 0).toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                {isIncluded && (
                                  <div className="flex items-center space-x-3">
                                    {item.splitMethod === "PERCENTAGE" && (
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={participantSplit.percentage ?? ""}
                                          onChange={(e) =>
                                            updateItemParticipantValue(
                                              index,
                                              participantSplit.participantId,
                                              "percentage",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                        <span className="text-sm text-gray-500">%</span>
                                      </div>
                                    )}

                                    {item.splitMethod === "EXACT" && (
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={participantSplit.amount ?? ""}
                                        onChange={(e) =>
                                          updateItemParticipantValue(
                                            index,
                                            participantSplit.participantId,
                                            "amount",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                      />
                                    )}

                                    {item.splitMethod === "SHARE" && (
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={participantSplit.shares ?? 1}
                                          onChange={(e) =>
                                            updateItemParticipantValue(
                                              index,
                                              participantSplit.participantId,
                                              "shares",
                                              Math.max(0, parseInt(e.target.value, 10) || 0)
                                            )
                                          }
                                          className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                        <span className="text-sm text-gray-500">share(s)</span>
                                      </div>
                                    )}

                                    {item.splitMethod === "EQUAL" && includedCount > 0 && (
                                      <span className="text-sm text-gray-500">
                                        Equal share among {includedCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {item.participants.filter((participant) => participant.isIncluded).length === 0 && (
                            <p className="text-sm text-red-600">
                              Select at least one participant for this item.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center">
                      Add at least one item to continue.
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 text-sm text-blue-800 rounded-lg p-3">
                      Total of items: {group.currency} {itemTotal.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Choose a method to split the total amount among selected participants.
                  </p>

                  <div className="space-y-2">
                    {splits.map((split, index) => {
                      const participant = allParticipants.find((p) =>
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
                          {(splitMethod === "SHARE" || splitMethod === "ADJUSTMENT") && (
                            <span className="text-sm text-gray-500">
                              {split.amount
                                ? `Total share: ${group.currency} ${split.amount.toFixed(2)}`
                                : ""}
                            </span>
                          )}

                          {splitMethod === "EQUAL" && (
                            <span className="text-sm text-gray-500">
                              {amount
                                ? `${group.currency} ${(parseFloat(amount) / splits.length).toFixed(2)}`
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
                                  newSplits[index].percentage = parseFloat(e.target.value) || 0;
                                  newSplits[index].amount = amount
                                    ? (parseFloat(amount) * (newSplits[index].percentage || 0)) / 100
                                    : 0;
                                  setSplits(newSplits);
                                }}
                                className="w-16 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="0"
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          )}

                          {splitMethod === "EXACT" && (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={split.amount || 0}
                              onChange={(e) => {
                                const newSplits = [...splits];
                                newSplits[index].amount = parseFloat(e.target.value) || 0;
                                setSplits(newSplits);
                              }}
                              className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="0.00"
                            />
                          )}

                          {splitMethod === "SHARE" && (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={split.share || 1}
                                onChange={(e) => {
                                  const newSplits = [...splits];
                                  newSplits[index].share = parseFloat(e.target.value) || 0;
                                  const totalShares = newSplits.reduce((accumulator, currentItem) => {
                                    return accumulator + (currentItem.share ? currentItem.share : 1);
                                  }, 0);
                                  newSplits.forEach((newSplit, newSplitIndex) => {
                                    newSplits[newSplitIndex].amount = amount
                                      ? (parseFloat(amount) * (newSplit.share || 1)) / totalShares
                                      : 0;
                                  });
                                  setSplits(newSplits);
                                }}
                                className="w-16 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="0"
                              />
                              <span className="text-sm text-gray-500">share(s)</span>
                            </div>
                          )}

                          {splitMethod === "ADJUSTMENT" && (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-gray-500">+{group.currency}</span>
                              <input
                                type="number"
                                step="0.01"
                                value={split.adjustment || 0}
                                onChange={(e) => {
                                  const newSplits = [...splits];
                                  newSplits[index].adjustment = parseFloat(e.target.value) || 0;
                                  const totalAdjustments = newSplits.reduce((accumulator, currentSplit) => {
                                    return accumulator + (currentSplit.adjustment ? currentSplit.adjustment : 0);
                                  }, 0);
                                  newSplits.forEach((newSplit, newSplitIndex) => {
                                    newSplits[newSplitIndex].amount = amount
                                      ? (parseFloat(amount) - totalAdjustments) / newSplits.length +
                                        (newSplit.adjustment ? newSplit.adjustment : 0)
                                      : 0;
                                  });
                                  setSplits(newSplits);
                                }}
                                className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
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
                disabled={
                  submitting ||
                  !description ||
                  selectedParticipants.size === 0 ||
                  (isItemized ? itemTotal <= 0 || items.length === 0 : !amount)
                }
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
