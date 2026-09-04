export interface RobloxAccount {
  id: string;
  roblox_user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cookie: string;
  robux_balance: number;
  has_roblox_plus: boolean;
  tier: "high" | "low";
  daily_limit: number;
  monthly_limit: number;
  daily_sent: number;
  monthly_sent: number;
  daily_reset_at: string | null;
  monthly_reset_at: string | null;
  last_refreshed_at: string | null;
  status: "active" | "invalid";
  created_at: string;
  updated_at: string;
}

export interface RobloxTransfer {
  id: string;
  account_id: string;
  recipient_user_id: number;
  recipient_username: string;
  amount: number;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface AccountInfoResponse {
  robloxUserId: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  robuxBalance: number;
  hasRobloxPlus: boolean;
  tier: "high" | "low";
  dailyLimit: number;
  monthlyLimit: number;
  dailySent: number;
  monthlySent: number;
}

export interface TransferResponse {
  success: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}
