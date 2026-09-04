import { useState } from "react";
import {
  Send,
  RefreshCw,
  Trash2,
  Loader2,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Crown,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RobloxAccount, AccountInfoResponse } from "@/lib/types";
import {
  formatNumber,
  getDailyRemaining,
  getMonthlyRemaining,
  getDailyPercent,
  getMonthlyPercent,
  timeAgo,
  tierLabel,
} from "@/lib/utils";

interface AccountCardProps {
  account: RobloxAccount;
  onTransfer: () => void;
  onRefreshed: () => void;
  onDeleted: () => void;
}

export function AccountCard({ account, onTransfer, onRefreshed, onDeleted }: AccountCardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dailyRemaining = getDailyRemaining(account);
  const monthlyRemaining = getMonthlyRemaining(account);
  const dailyPercent = getDailyPercent(account);
  const monthlyPercent = getMonthlyPercent(account);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roblox-account-info`;
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookie: account.cookie, accountId: account.id }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          await supabase
            .from("roblox_accounts")
            .update({ status: "invalid", updated_at: new Date().toISOString() })
            .eq("id", account.id);
        }
        throw new Error(errData?.error || "Refresh failed");
      }

      const info: AccountInfoResponse = await resp.json();

      await supabase
        .from("roblox_accounts")
        .update({
          robux_balance: info.robuxBalance,
          has_roblox_plus: info.hasRobloxPlus,
          tier: info.tier,
          daily_limit: info.dailyLimit,
          monthly_limit: info.monthlyLimit,
          daily_sent: info.dailySent ?? 0,
          monthly_sent: info.monthlySent ?? 0,
          last_refreshed_at: new Date().toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      onRefreshed();
    } catch {
      // handled by parent refresh
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await supabase.from("roblox_accounts").delete().eq("id", account.id);
      onDeleted();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const isInvalid = account.status === "invalid";

  return (
    <div
      className={`bg-white rounded-2xl border transition-all hover:shadow-lg ${
        isInvalid ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          {account.avatar_url ? (
            <img
              src={account.avatar_url}
              alt={account.username}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
              {account.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 truncate">
                {account.display_name || account.username}
              </h3>
              {account.has_roblox_plus ? (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                  <Crown className="w-3 h-3" />
                  Plus
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 truncate">@{account.username}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isInvalid && (
          <div className="flex items-center gap-1.5 mt-3 p-2 rounded-lg bg-red-50 border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-xs text-red-600">Cookie expired or invalid. Refresh or re-add the account.</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100">
          <div>
            <p className="text-xs text-blue-400 font-medium">Robux Balance</p>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(account.robux_balance)}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              {account.tier === "high" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-xs font-medium text-slate-500">{tierLabel(account.tier)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{account.tier === "high" ? "Verified" : "Standard"} tier</p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Daily Limit</span>
              <span className="text-slate-400">
                {formatNumber(account.daily_sent)} / {formatNumber(account.daily_limit)} R$
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  dailyPercent >= 100 ? "bg-red-400" : dailyPercent >= 80 ? "bg-amber-400" : "bg-blue-400"
                }`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {formatNumber(dailyRemaining)} R$ remaining today
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Monthly Limit</span>
              <span className="text-slate-400">
                {formatNumber(account.monthly_sent)} / {formatNumber(account.monthly_limit)} R$
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  monthlyPercent >= 100 ? "bg-red-400" : monthlyPercent >= 80 ? "bg-amber-400" : "bg-sky-400"
                }`}
                style={{ width: `${monthlyPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {formatNumber(monthlyRemaining)} R$ remaining this month
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Updated {timeAgo(account.last_refreshed_at)}</span>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onTransfer}
          disabled={isInvalid || !account.has_roblox_plus || dailyRemaining <= 0 || monthlyRemaining <= 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          Transfer Robux
        </button>
        {!account.has_roblox_plus && !isInvalid && (
          <p className="text-xs text-amber-500 text-center mt-2">Roblox Plus required to transfer</p>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 rounded-2xl">
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Delete this account?</h3>
            <p className="text-xs text-slate-400 mb-4">
              This will remove the account and all its transfer history.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
