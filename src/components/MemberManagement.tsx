"use client";

import { useState } from "react";
import { User } from "@prisma/client";

interface GroupMember {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "LEFT" | "REMOVED";
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}


interface Group {
  id: string;
  name: string;
  currency: string;
  members: GroupMember[];
}

interface Props {
  group: Group;
  memberBalances?: Map<string, number>;
  currentUser: User;
  isAdmin: boolean;
}

export default function MemberManagement({
  group,
  memberBalances,
  currentUser,
  isAdmin,
}: Props) {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const inviteLink = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/groups/${group.id}/invite`;


  const handleAddMember = async (e?: React.FormEvent) => {
    e?.preventDefault(); // Prevent default form submission
    if (!newMemberEmail.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newMemberEmail }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.isInvitation) {
          setSuccess(`Invitation sent to ${newMemberEmail}!`);
        } else {
          setSuccess(`${newMemberEmail} added to the group!`);
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }, 1000);
        }
        setNewMemberEmail("");
        setIsAddingMember(false);
      } else {
        const result = await response.json();
        setError(result.error || "Failed to add member");
      }
    } catch {
      setError("Failed to add member");
    } finally {
      setLoading(false);
    }
  };



  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(`Are you sure you want to remove ${memberName} from the group?`)
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/groups/${group.id}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setSuccess("Member removed successfully!");

      // Refresh the page to reflect the change
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: "ADMIN" | "MEMBER"
  ) => {
    // Prevent demoting the last admin
    if (newRole === "MEMBER") {
      const adminCount = group.members.filter(
        (m) => m.role === "ADMIN" && m.status === "ACTIVE"
      ).length;
      if (adminCount <= 1) {
        setError(
          "Cannot demote the last admin. At least one admin must remain in the group."
        );
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/groups/${group.id}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      setSuccess("Role updated successfully!");

      // Refresh the page to reflect the change
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({group.members.length})
          </h2>
          <p className="text-sm text-gray-500">
            {group.members.filter((m) => m.role === "ADMIN").length} admin
            {group.members.filter((m) => m.role === "ADMIN").length !== 1
              ? "s"
              : ""}
            , {group.members.filter((m) => m.role === "MEMBER").length} member
            {group.members.filter((m) => m.role === "MEMBER").length !== 1
              ? "s"
              : ""}
          </p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                setSuccess("Invite link copied to clipboard!");
                setTimeout(() => setSuccess(""), 3000);
              }}
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors text-sm"
              disabled={loading}
            >
              Copy Invite Link
            </button>
            <button
              onClick={() => setIsAddingMember(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
              disabled={loading}
            >
              Add Member
            </button>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}



      {/* Add Member Form */}
      {isAddingMember && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <form onSubmit={handleAddMember}>
            <div className="flex space-x-2">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMember(false);
                  setNewMemberEmail("");
                  setError("");
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {group.members.map((member) => {
          const isCurrentUser = member.userId === currentUser.id;
          const isInvited = member.status === "INVITED";
          const isLastAdmin =
            member.role === "ADMIN" &&
            group.members.filter((m) => m.role === "ADMIN" && m.status === "ACTIVE")
              .length <= 1;

          return (
            <div
              key={member.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                loading
                  ? "bg-gray-100 opacity-50"
                  : isInvited
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isInvited ? "bg-yellow-100" : "bg-blue-100"
                }`}>
                  <span className={`text-sm font-medium ${
                    isInvited ? "text-yellow-600" : "text-blue-600"
                  }`}>
                    {(member.user.name || member.user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {member.user.name || member.user.email}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        You
                      </span>
                    )}
                    {isInvited && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.user.email}
                    {isInvited && (
                      <span className="text-yellow-600"> • Invitation sent</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Balance Info */}
                {memberBalances && !isInvited && (
                  <div className="text-right mr-2">
                    {(() => {
                      const balance = memberBalances.get(member.userId) || 0;
                      const isPositive = balance > 0.01;
                      const isNegative = balance < -0.01;
                      
                      if (isPositive) {
                        return (
                          <div className="text-sm text-green-600 font-medium">
                            +{formatCurrency(balance, group.currency)}
                          </div>
                        );
                      } else if (isNegative) {
                        return (
                          <div className="text-sm text-red-600 font-medium">
                            {formatCurrency(balance, group.currency)}
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-gray-500">
                            {formatCurrency(0, group.currency)}
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
                {isInvited && (
                  <div className="text-right mr-2">
                    <div className="text-sm text-gray-500">
                      Not active yet
                    </div>
                  </div>
                )}
                
                {/* Role Badge */}
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    member.role === "ADMIN"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {member.role}
                </span>

                {/* Actions (only for admins) */}
                {isAdmin && !isCurrentUser && (
                  <div className="flex space-x-1">
                    {/* Role Toggle */}
                    {!isInvited && (
                      <button
                        onClick={() =>
                          handleUpdateRole(
                            member.id,
                            member.role === "ADMIN" ? "MEMBER" : "ADMIN"
                          )
                        }
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isLastAdmin && member.role === "ADMIN"
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        }`}
                        disabled={
                          loading || (isLastAdmin && member.role === "ADMIN")
                        }
                        title={
                          isLastAdmin && member.role === "ADMIN"
                            ? "Cannot demote the last admin"
                            : ""
                        }
                      >
                        {loading
                          ? "..."
                          : `Make ${
                              member.role === "ADMIN" ? "Member" : "Admin"
                            }`}
                      </button>
                    )}

                    {/* Remove Member */}
                    <button
                      onClick={() =>
                        handleRemoveMember(
                          member.id,
                          member.user.name || member.user.email
                        )
                      }
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                      disabled={loading}
                    >
                      {loading ? "..." : isInvited ? "Cancel Invite" : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Instructions */}
      {isAdmin && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-600">
            <strong>Admin privileges:</strong> Add members, change roles, and
            remove members from the group. At least one admin must remain in the
            group.
          </p>
        </div>
      )}
    </div>
  );
}
