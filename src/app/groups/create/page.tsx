"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

export default function CreateGroup() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imageUrl, setImageUrl] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError("You must be logged in to create a group");
      return;
    }

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const groupData = {
        name: name.trim(),
        description: description.trim() || undefined,
        currency,
        imageUrl: imageUrl.trim() || undefined,
      };

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/groups/${data.id}`);
      } else {
        setError(data.error || "Failed to create group");
      }
    } catch (err) {
      console.error("Error creating group:", err);
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
          <nav className="flex items-center space-x-2 text-sm font-body mb-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              Dashboard
            </Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-900">Create Group</span>
          </nav>
          
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Create New Group
          </h1>
          <p className="text-gray-600 mt-2 font-body">
            Start a new group to share expenses with friends, family, or colleagues
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
                Group Details
              </h2>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Group Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g., Roommates, Europe Trip 2025, Office Lunch Club"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body"
                  disabled={loading}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {name.length}/100 characters
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="What is this group for? Add any details that will help members understand the purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body"
                  disabled={loading}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </p>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Currency *
                </label>
                <select
                  id="currency"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body"
                  disabled={loading}
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  All expenses in this group will use this currency
                </p>
              </div>

              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Group Image URL (optional)
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/group-photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add a photo to help identify your group
                </p>
              </div>
            </div>

            {/* Preview */}
            {(name || description) && (
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3 font-display">
                  Preview
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt="Group"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-xl object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                            if (fallback) {
                              fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <span className={`text-xl fallback-icon ${imageUrl ? 'hidden' : ''}`}>👥</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 font-body">
                        {name || "Group Name"}
                      </h4>
                      {description && (
                        <p className="text-sm text-gray-600 mt-1 font-body">
                          {description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {CURRENCIES.find(c => c.code === currency)?.symbol} {currency}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created by {session.user?.name || session.user?.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-lg">💡</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 font-body">
                    What happens after you create the group?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1 font-body">
                      <li>You&apos;ll become the group admin automatically</li>
                      <li>You can invite members by sharing the group link</li>
                      <li>Start adding expenses and splitting costs immediately</li>
                      <li>All members can view expenses and balances</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

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
                  disabled={loading || !name.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
                >
                  {loading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
            💡 Quick Tips for Great Groups
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">
                1
              </span>
              <div>
                <h4 className="font-medium text-gray-900 font-body">Choose a clear name</h4>
                <p className="text-sm text-gray-600 font-body">
                  Make it obvious what the group is for
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">
                2
              </span>
              <div>
                <h4 className="font-medium text-gray-900 font-body">Set the right currency</h4>
                <p className="text-sm text-gray-600 font-body">
                  This can&apos;t be changed later
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">
                3
              </span>
              <div>
                <h4 className="font-medium text-gray-900 font-body">Add a description</h4>
                <p className="text-sm text-gray-600 font-body">
                  Help members understand the purpose
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">
                4
              </span>
              <div>
                <h4 className="font-medium text-gray-900 font-body">Invite active members</h4>
                <p className="text-sm text-gray-600 font-body">
                  Groups work best with engaged participants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
