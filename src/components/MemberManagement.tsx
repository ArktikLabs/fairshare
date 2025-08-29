"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@prisma/client";

interface GroupMember {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  isActive: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface GroupInvitation {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  token: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
}

interface Props {
  group: Group;
  currentUser: User;
  isAdmin: boolean;
}

export default function MemberManagement({
  group,
  currentUser,
  isAdmin,
}: Props) {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  const inviteLink = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/groups/${group.id}/invite`;

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    }
  }, [group.id]);

  useEffect(() => {
    if (isAdmin && showInvitations) {
      fetchInvitations();
    }
  }, [isAdmin, showInvitations, fetchInvitations]);

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
          if (showInvitations) {
            fetchInvitations(); // Refresh invitations list
          }
        } else {
          setSuccess(`${newMemberEmail} added to the group!`);
          setTimeout(() => {
            window.location.reload();
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

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/invitations`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      if (response.ok) {
        setSuccess("Invitation cancelled successfully");
        fetchInvitations(); // Refresh invitations list
      } else {
        const result = await response.json();
        setError(result.error || "Failed to cancel invitation");
      }
    } catch {
      setError("Failed to cancel invitation");
    }
  };

  const copyInvitationLink = async (token: string) => {
    const link = `${
      typeof window !== "undefined" ? window.location.origin : ""
    }/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(""), 2000);
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
      window.location.reload();
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
        (m) => m.role === "ADMIN" && m.isActive
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
      window.location.reload();
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
              onClick={() => setShowInviteLink(!showInviteLink)}
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors text-sm"
              disabled={loading}
            >
              Share Invite Link
            </button>
            <button
              onClick={() => setShowInvitations(!showInvitations)}
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors text-sm"
              disabled={loading}
            >
              Pending Invitations
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

      {/* Invite Link */}
      {showInviteLink && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Invite Link
          </h3>
          <p className="text-xs text-blue-700 mb-3">
            Share this link with people you want to invite to the group:
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 border border-blue-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                setSuccess("Invite link copied to clipboard!");
                setTimeout(() => setSuccess(""), 3000);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Pending Invitations Section */}
      {showInvitations && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold mb-3 text-yellow-800">
            Pending Invitations ({invitations.length})
          </h4>
          {invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-white rounded border"
                >
                  <div className="flex-1">
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-sm text-gray-500">
                      Role: {invitation.role} • Expires:{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyInvitationLink(invitation.token)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {copiedLink === invitation.token
                        ? "Copied!"
                        : "Copy Link"}
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-700">No pending invitations</p>
          )}
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
          const isLastAdmin =
            member.role === "ADMIN" &&
            group.members.filter((m) => m.role === "ADMIN" && m.isActive)
              .length <= 1;

          return (
            <div
              key={member.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                loading
                  ? "bg-gray-100 opacity-50"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
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
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
                      {loading ? "..." : "Remove"}
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
