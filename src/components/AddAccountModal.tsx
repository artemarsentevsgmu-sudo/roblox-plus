import { useState } from "react";
import { X, Loader2, AlertCircle, Cookie } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AccountInfoResponse } from "@/lib/types";

interface AddAccountModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddAccountModal({ onClose, onAdded }: AddAccountModalProps) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!cookie.trim()) {
      setError("Please paste a .ROBLOSECURITY cookie");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roblox-account-info`;
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookie: cookie.trim() }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to verify cookie (${resp.status})`);
      }

      const info: AccountInfoResponse = await resp.json();

      const { error: insertError } = await supabase.from("roblox_accounts").insert({
        roblox_user_id: info.robloxUserId,
        username: info.username,
        display_name: info.displayName,
        avatar_url: info.avatarUrl,
        cookie: cookie.trim(),
        robux_balance: info.robuxBalance,
        has_roblox_plus: info.hasRobloxPlus,
        tier: info.tier,
        daily_limit: info.dailyLimit,
        monthly_limit: info.monthlyLimit,
        daily_sent: info.dailySent ?? 0,
        monthly_sent: info.monthlySent ?? 0,
        last_refreshed_at: new Date().toISOString(),
        status: "active",
      });

      if (insertError) throw new Error(insertError.message);

      onAdded();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add account";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800">Add Roblox Account</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              .ROBLOSECURITY Cookie
            </label>
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="Paste your .ROBLOSECURITY cookie value here..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none font-mono"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-slate-400">
              The app will verify the cookie, fetch account info, and determine the transfer limit tier automatically.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
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
            onClick={handleAdd}
            disabled={loading || !cookie.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Verifying..." : "Add Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
