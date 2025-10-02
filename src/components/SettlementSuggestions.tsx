"use client";

import { useState, useEffect } from "react";
import {
  formatSettlementAmount,
  getSettlementSummary,
  getUserSettlements,
  GroupSettlements
} from "../lib/settlement-utils";

interface Props {
  group: {
    id: string;
    name: string;
    currency: string;
  };
  currentUserId: string;
}

export default function SettlementSuggestions({ group, currentUserId }: Props) {
  const [settlements, setSettlements] = useState<GroupSettlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSettlements() {
      try {
        const response = await fetch(`/api/groups/${group.id}/settlements`);
        if (response.ok) {
          const data = await response.json();
          setSettlements(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load settlements");
        }
      } catch (err) {
        setError("Failed to load settlements");
        console.error("Error fetching settlements:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettlements();
  }, [group.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Suggestions</h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!settlements) {
    return null;
  }

  const { owes, owed } = getUserSettlements(settlements.suggestedSettlements, currentUserId);
  const currentUserBalance = settlements.balances.find(b => b.userId === currentUserId);

  return (
    <div className="space-y-6">
      {/* Settlement Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Summary</h2>
        
        {settlements.suggestedSettlements.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">All Settled Up!</h3>
            <p className="text-gray-600">Everyone in the group is even. No payments needed!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h3 className="font-medium text-blue-900">
                  {getSettlementSummary(settlements.suggestedSettlements)}
                </h3>
                <p className="text-sm text-blue-600">
                  Optimized to minimize transactions
                </p>
              </div>
              <div className="text-2xl text-blue-600">💰</div>
            </div>

            {/* Current User Balance */}
            {currentUserBalance && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Your Balance</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Net balance:</span>
                  <span className={`font-medium ${
                    currentUserBalance.netBalance > 0.01 
                      ? 'text-green-600' 
                      : currentUserBalance.netBalance < -0.01 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    {currentUserBalance.netBalance > 0.01 && '+'}
                    {formatSettlementAmount(currentUserBalance.netBalance, group.currency)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Paid: {formatSettlementAmount(currentUserBalance.totalPaid, group.currency)} • 
                  Owed: {formatSettlementAmount(currentUserBalance.totalOwed, group.currency)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Your Payments */}
      {(owes.length > 0 || owed.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Payments</h2>
          
          {/* Money You Owe */}
          {owes.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-red-600 mb-3">💸 You owe:</h3>
              <div className="space-y-2">
                {owes.map((settlement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <span className="font-medium text-gray-900">Pay {settlement.toUserName}</span>
                      <div className="text-sm text-gray-600">Settle your expenses</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {formatSettlementAmount(settlement.amount, settlement.currency)}
                      </div>
                      <button className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                        Mark as Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Money Owed to You */}
          {owed.length > 0 && (
            <div>
              <h3 className="font-medium text-green-600 mb-3">💚 You are owed:</h3>
              <div className="space-y-2">
                {owed.map((settlement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <span className="font-medium text-gray-900">{settlement.fromUserName} owes you</span>
                      <div className="text-sm text-gray-600">From shared expenses</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatSettlementAmount(settlement.amount, settlement.currency)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Waiting for payment
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Settlements */}
      {settlements.suggestedSettlements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Settlement Suggestions</h2>
          <div className="space-y-3">
            {settlements.suggestedSettlements.map((settlement, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {settlement.fromUserName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {settlement.fromUserName} → {settlement.toUserName}
                    </div>
                    <div className="text-sm text-gray-500">Settlement payment</div>
                  </div>
                </div>
                <div className="font-bold text-gray-900">
                  {formatSettlementAmount(settlement.amount, settlement.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Balances */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Balances</h2>
        <div className="space-y-3">
          {settlements.balances.map((balance) => (
            <div key={balance.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {balance.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {balance.name}
                    {balance.userId === currentUserId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Paid: {formatSettlementAmount(balance.totalPaid, group.currency)} • 
                    Owed: {formatSettlementAmount(balance.totalOwed, group.currency)}
                  </div>
                </div>
              </div>
              <div className={`font-bold ${
                balance.netBalance > 0.01 
                  ? 'text-green-600' 
                  : balance.netBalance < -0.01 
                    ? 'text-red-600' 
                    : 'text-gray-600'
              }`}>
                {balance.netBalance > 0.01 && '+'}
                {formatSettlementAmount(balance.netBalance, group.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
