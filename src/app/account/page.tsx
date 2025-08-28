"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PasskeyManagement from "@/components/PasskeyManagement";
import Link from "next/link";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/auth/signin");
    if (session?.user?.name) setName(session.user.name);
  }, [session, status, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage("Profile updated successfully!");
        setIsEditing(false);
        // Refresh session to get updated data
        window.location.reload();
      } else {
        setMessage("Failed to update profile. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(
          "Data export initiated! You'll receive an email when it's ready."
        );
      } else {
        setMessage("Failed to initiate data export. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      setMessage("Please type 'DELETE MY ACCOUNT' exactly to confirm.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationText: deleteConfirmText }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        if (data.redirectUrl) {
          setTimeout(() => {
            signOut({ callbackUrl: data.redirectUrl });
          }, 2000);
        }
      } else {
        setMessage(data.error || "Failed to delete account.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage("New password must be at least 8 characters long");
      return;
    }

    setPasswordLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowChangePassword(false);
      } else {
        setMessage(data.error || data.message || "Failed to change password");
      }
    } catch (error) {
      setMessage("An error occurred while changing password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-display text-gray-700">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-display tracking-tight text-gray-900">
                Fair<span className="text-green-600">Share</span>
              </h1>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-green-600 transition-colors font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-display tracking-tight text-gray-900 mb-2">
              Account Settings
            </h1>
            <p className="text-lg text-gray-600 font-body">
              Manage your profile information and security settings.
            </p>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">👤</span>
                  Profile Information
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {message && (
                <div
                  className={`mb-4 px-4 py-3 rounded-xl font-body ${
                    message.includes("success")
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">
                      {message.includes("success") ? "✅" : "⚠️"}
                    </span>
                    {message}
                  </div>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Display Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-body"
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={session.user?.email || ""}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-body"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setName(session.user?.name || "");
                        setMessage("");
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      Display Name
                    </span>
                    <span className="text-sm text-gray-900 font-body">
                      {session.user?.name || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      Email Address
                    </span>
                    <span className="text-sm text-gray-900 font-body">
                      {session.user?.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      User ID
                    </span>
                    <span className="text-sm text-gray-500 font-mono text-xs">
                      {session.user?.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium text-gray-600">
                      Member Since
                    </span>
                    <span className="text-sm text-gray-900 font-body">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🔒</span>
                Security Settings
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Password Management */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2 font-display">
                  Password Authentication
                </h3>
                <p className="text-sm text-blue-700 mb-3 font-body">
                  Change your password for enhanced security.
                </p>
                <button 
                  onClick={() => setShowChangePassword(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Change Password
                </button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-2 font-display">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-purple-700 mb-3 font-body">
                  Add an extra layer of security to your account.
                </p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Enable 2FA
                </button>
              </div>

              {/* Active Sessions */}
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <h3 className="font-semibold text-orange-900 mb-2 font-display">
                  Active Sessions
                </h3>
                <p className="text-sm text-orange-700 mb-3 font-body">
                  Manage and revoke active sessions on other devices.
                </p>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Manage Sessions
                </button>
              </div>
            </div>
          </div>

          {/* Passkey Management */}
          <PasskeyManagement />

          {/* Account Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-display font-semibold text-gray-900 flex items-center">
                <span className="mr-2">⚙️</span>
                Account Actions
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Export Data */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900 font-display">
                    Export Account Data
                  </h3>
                  <p className="text-sm text-gray-600 font-body">
                    Download a copy of all your account data and expenses.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={loading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Exporting..." : "Export Data"}
                </button>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-red-50">
                <div>
                  <h3 className="font-medium text-red-900 font-display">
                    Delete Account
                  </h3>
                  <p className="text-sm text-red-700 font-body">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-display font-semibold text-red-900 mb-4">
                  ⚠️ Delete Account
                </h3>
                <p className="text-gray-700 font-body mb-4">
                  This action cannot be undone. This will permanently delete
                  your account and remove all your data from our servers.
                </p>
                <p className="text-sm text-gray-600 font-body mb-4">
                  Please type <strong>DELETE MY ACCOUNT</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4 font-body"
                  placeholder="Type DELETE MY ACCOUNT"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={
                      loading || deleteConfirmText !== "DELETE MY ACCOUNT"
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Deleting..." : "Delete Account"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Modal */}
          {showChangePassword && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-display font-semibold text-blue-900 mb-4">
                  🔒 Change Password
                </h3>
                {message && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    message.includes('successfully') 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body text-gray-900 placeholder-gray-400"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body text-gray-900 placeholder-gray-400"
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body text-gray-900 placeholder-gray-400"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordLoading ? "Changing..." : "Change Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                        setMessage("");
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
