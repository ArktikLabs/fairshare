"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatSettlementAmount,
  getSettlementSummary,
  getUserSettlements,
  type GroupSettlements,
  type Settlement,
} from "../lib/settlement-utils";

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  description: string | null;
  createdAt: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
}

type SettlementData = GroupSettlements & { history: PaymentRecord[] };

interface Props {
  group: {
    id: string;
    name: string;
    currency: string;
  };
  currentUserId: string;
  isAdmin?: boolean;
}

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other (e-wallet, etc.)" },
];

export default function SettlementSuggestions({ group, currentUserId, isAdmin = false }: Props) {
  const [data, setData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<Settlement | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/settlements`);
      const body = await response.json();
      if (response.ok) {
        setData(body);
        setError("");
      } else {
        setError(body.error || "Failed to load settlements");
      }
    } catch (err) {
      setError("Failed to load settlements");
      console.error("Error fetching settlements:", err);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openPay = (s: Settlement) => {
    setPaying(s);
    setPayAmount(String(s.amount));
    setPayMethod("CASH");
    setNotice("");
  };

  const recordPayment = async () => {
    if (!paying) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/${group.id}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: paying.fromUserId,
          toUserId: paying.toUserId,
          amount,
          method: payMethod,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Failed to record payment");
        return;
      }
      setNotice(
        `Recorded: ${paying.fromUserName} paid ${paying.toUserName} ${formatSettlementAmount(amount, group.currency)}`
      );
      setPaying(null);
      await load();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Balances</h2>
        <p className="text-red-600 mb-4">{error || "Failed to load settlements"}</p>
        <button onClick={load} className="text-blue-600 hover:text-blue-800 font-medium">
          Try again
        </button>
      </div>
    );
  }

  const fmt = (n: number) => formatSettlementAmount(n, group.currency);
  const { owes, owed } = getUserSettlements(data.suggestedSettlements, currentUserId);
  const me = data.balances.find((b) => b.userId === currentUserId);
  const canRecord = (s: Settlement) =>
    isAdmin || s.fromUserId === currentUserId || s.toUserId === currentUserId;

  const PayButton = ({ s, label }: { s: Settlement; label: string }) =>
    canRecord(s) ? (
      <button
        onClick={() => openPay(s)}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-1"
      >
        {label}
      </button>
    ) : null;

  return (
    <div className="space-y-6 mb-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Balances</h2>
            <p className="text-sm text-gray-500">{getSettlementSummary(data.suggestedSettlements)}</p>
          </div>
          {me && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Your balance</div>
              <div
                className={`text-lg font-semibold ${
                  me.netBalance > 0 ? "text-green-600" : me.netBalance < 0 ? "text-red-600" : "text-gray-600"
                }`}
              >
                {me.netBalance > 0 && "+"}
                {fmt(me.netBalance)}
              </div>
            </div>
          )}
        </div>

        {notice && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{notice}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
        )}

        {paying && (
          <div className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-3">
            <div className="text-sm text-blue-900">
              Record that <strong>{paying.fromUserName}</strong> paid <strong>{paying.toUserName}</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-40 border border-gray-300 rounded-md px-3 py-2 text-sm"
                aria-label="Amount paid"
              />
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                aria-label="Payment method"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={recordPayment}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Record payment"}
              </button>
              <button
                onClick={() => setPaying(null)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.suggestedSettlements.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-medium text-green-600">All settled up</p>
            <p className="text-sm text-gray-500">Nobody owes anything in this group.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {owes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2">You owe</h3>
                <div className="space-y-2">
                  {owes.map((s) => (
                    <div key={s.toUserId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="font-medium text-gray-900">Pay {s.toUserName}</span>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{fmt(s.amount)}</div>
                        <PayButton s={s} label="Mark as paid" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {owed.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-600 mb-2">You are owed</h3>
                <div className="space-y-2">
                  {owed.map((s) => (
                    <div key={s.fromUserId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="font-medium text-gray-900">{s.fromUserName} owes you</span>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{fmt(s.amount)}</div>
                        <PayButton s={s} label="Mark as received" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested payments for the group</h3>
              <div className="space-y-2">
                {data.suggestedSettlements.map((s) => (
                  <div key={`${s.fromUserId}-${s.toUserId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">
                      <span className="font-medium">{s.fromUserName}</span>
                      <span className="text-gray-500"> → </span>
                      <span className="font-medium">{s.toUserName}</span>
                    </span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmt(s.amount)}</div>
                      {s.fromUserId !== currentUserId && s.toUserId !== currentUserId && (
                        <PayButton s={s} label="Record payment" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member balances */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Member balances</h2>
        <div className="space-y-2">
          {data.balances.map((b) => (
            <div key={b.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">
                  {b.name}
                  {b.userId === currentUserId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Paid {fmt(b.totalPaid)} • Share {fmt(b.totalOwed)}
                  {b.settledNet !== 0 && ` • Settled ${b.settledNet > 0 ? "+" : ""}${fmt(b.settledNet)}`}
                </div>
              </div>
              <div
                className={`font-semibold ${
                  b.netBalance > 0 ? "text-green-600" : b.netBalance < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                {b.netBalance > 0 && "+"}
                {fmt(b.netBalance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      {data.history.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payments</h2>
          <div className="space-y-2">
            {data.history.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-gray-900">{p.from.name}</span>
                  <span className="text-gray-500"> paid </span>
                  <span className="font-medium text-gray-900">{p.to.name}</span>
                  <div className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()} • {p.method.replace("_", " ").toLowerCase()}
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
