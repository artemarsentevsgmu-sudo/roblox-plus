import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Wallet, Users, TrendingUp, Shield, Loader2, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RobloxAccount } from "@/lib/types";
import { AddAccountModal } from "@/components/AddAccountModal";
import { TransferModal } from "@/components/TransferModal";
import { AccountCard } from "@/components/AccountCard";
import { formatNumber, getDailyRemaining, getMonthlyRemaining } from "@/lib/utils";

type FilterTier = "all" | "high" | "low" | "plus" | "no-plus" | "invalid";

export default function App() {
  const [accounts, setAccounts] = useState<RobloxAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferAccount, setTransferAccount] = useState<RobloxAccount | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTier>("all");

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("roblox_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load accounts:", error);
      return;
    }
    setAccounts((data || []) as RobloxAccount[]);
  }, []);

  useEffect(() => {
    fetchAccounts().finally(() => setLoading(false));
  }, [fetchAccounts]);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      !search ||
      acc.username.toLowerCase().includes(search.toLowerCase()) ||
      acc.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(acc.roblox_user_id).includes(search);

    let matchesFilter = true;
    switch (filter) {
      case "high":
        matchesFilter = acc.tier === "high";
        break;
      case "low":
        matchesFilter = acc.tier === "low";
        break;
      case "plus":
        matchesFilter = acc.has_roblox_plus;
        break;
      case "no-plus":
        matchesFilter = !acc.has_roblox_plus;
        break;
      case "invalid":
        matchesFilter = acc.status === "invalid";
        break;
      default:
        matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.robux_balance, 0);
  const totalAccounts = accounts.length;
  const totalPlusAccounts = accounts.filter((a) => a.has_roblox_plus).length;
  const totalDailyRemaining = accounts.reduce((sum, a) => sum + getDailyRemaining(a), 0);
  const totalMonthlyRemaining = accounts.reduce((sum, a) => sum + getMonthlyRemaining(a), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 leading-tight">Robux Manager</h1>
                <p className="text-xs text-slate-400 leading-tight">Roblox Plus Transfer Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Account</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Total Balance</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{formatNumber(totalBalance)} R$</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Accounts</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalAccounts}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Plus Subscribers</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalPlusAccounts}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Daily Limit Left</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{formatNumber(totalDailyRemaining)} R$</p>
          </div>
        </div>

        {/* Monthly remaining banner */}
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white">
          <Shield className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Total Monthly Transfer Capacity Remaining</p>
            <p className="text-xs text-blue-100">{formatNumber(totalMonthlyRemaining)} R$ across all accounts</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {(
              [
                ["all", "All"],
                ["high", "5K Limit"],
                ["low", "500 Limit"],
                ["plus", "Plus"],
                ["no-plus", "No Plus"],
                ["invalid", "Invalid"],
              ] as [FilterTier, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === key
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Account Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              {accounts.length === 0 ? "No accounts yet" : "No matching accounts"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {accounts.length === 0
                ? "Add a Roblox account by pasting its .ROBLOSECURITY cookie"
                : "Try adjusting your search or filter"}
            </p>
            {accounts.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Account
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAccounts.map((account) => (
              <div key={account.id} className="relative">
                <AccountCard
                  account={account}
                  onTransfer={() => setTransferAccount(account)}
                  onRefreshed={fetchAccounts}
                  onDeleted={fetchAccounts}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchAccounts()}
        />
      )}

      {transferAccount && (
        <TransferModal
          account={transferAccount}
          onClose={() => setTransferAccount(null)}
          onTransferred={() => fetchAccounts()}
        />
      )}
    </div>
  );
}
