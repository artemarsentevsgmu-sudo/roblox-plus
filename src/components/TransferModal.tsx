import { useState } from "react";
import { X, Loader2, AlertCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RobloxAccount, TransferResponse } from "@/lib/types";
import { formatNumber, getDailyRemaining, getMonthlyRemaining } from "@/lib/utils";

interface TransferModalProps {
  account: RobloxAccount;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferModal({ account, onClose, onTransferred }: TransferModalProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [transfers, setTransfers] = useState<RobloxAccount["id"] extends never ? never : Array<{
    id: string;
    recipient_username: string;
    amount: number;
    status: string;
    error_message: string | null;
    created_at: string;
  }>>([]);

  const dailyRemaining = getDailyRemaining(account);
  const monthlyRemaining = getMonthlyRemaining(account);

  async function handleTransfer() {
    const amt = parseInt(amount, 10);
    if (!recipient.trim()) {
      setError("Enter the recipient's Roblox username");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Enter a valid Robux amount");
      return;
    }
    if (amt > dailyRemaining) {
      setError(`Amount exceeds daily remaining limit (${formatNumber(dailyRemaining)} R$)`);
      return;
    }
    if (amt > monthlyRemaining) {
      setError(`Amount exceeds monthly remaining limit (${formatNumber(monthlyRemaining)} R$)`);
      return;
    }
    if (amt > account.robux_balance) {
      setError(`Insufficient balance (${formatNumber(account.robux_balance)} R$)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roblox-transfer`;
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cookie: account.cookie,
          recipientUsername: recipient.trim(),
          amount: amt,
          accountId: account.id,
        }),
      });

      const data: TransferResponse = await resp.json().catch(() => ({ success: false, data: null }));

      if (!resp.ok || data.error) {
        throw new Error(data.error || `Transfer failed (${resp.status})`);
      }

      onTransferred();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("roblox_transfers")
      .select("id, recipient_username, amount, status, error_message, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransfers(data || []);
  }

  function toggleHistory() {
    if (!showHistory && transfers.length === 0) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800">
              Transfer Robux
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            {account.avatar_url ? (
              <img
                src={account.avatar_url}
                alt={account.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-medium">
                {account.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-800">{account.display_name || account.username}</p>
              <p className="text-xs text-slate-400">@{account.username}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold text-slate-800">{formatNumber(account.robux_balance)} R$</p>
              <p className="text-xs text-slate-400">Balance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-400 font-medium">Daily Remaining</p>
              <p className="text-lg font-bold text-blue-600">{formatNumber(dailyRemaining)} R$</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <p className="text-xs text-sky-400 font-medium">Monthly Remaining</p>
              <p className="text-lg font-bold text-sky-600">{formatNumber(monthlyRemaining)} R$</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Recipient Username
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Roblox username..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Amount (Robux)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              disabled={loading}
            />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, dailyRemaining].filter((v) => v > 0 && v <= account.robux_balance).map((v, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(String(v))}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  {formatNumber(v)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              onClick={toggleHistory}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Transfer History
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {transfers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No transfers yet</p>
                ) : (
                  transfers.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{t.recipient_username}</span>
                        <span className="text-slate-400 ml-2">
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{formatNumber(t.amount)} R$</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            t.status === "success"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading || !recipient.trim() || !amount}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Sending..." : "Send Robux"}
          </button>
        </div>
      </div>
    </div>
  );
}
