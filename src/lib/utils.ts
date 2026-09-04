export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function getDailyRemaining(account: { daily_limit: number; daily_sent: number }): number {
  return Math.max(0, account.daily_limit - account.daily_sent);
}

export function getMonthlyRemaining(account: { monthly_limit: number; monthly_sent: number }): number {
  return Math.max(0, account.monthly_limit - account.monthly_sent);
}

export function getDailyPercent(account: { daily_limit: number; daily_sent: number }): number {
  if (account.daily_limit === 0) return 0;
  return Math.min(100, (account.daily_sent / account.daily_limit) * 100);
}

export function getMonthlyPercent(account: { monthly_limit: number; monthly_sent: number }): number {
  if (account.monthly_limit === 0) return 0;
  return Math.min(100, (account.monthly_sent / account.monthly_limit) * 100);
}

export function timeAgo(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function tierLabel(tier: "high" | "low"): string {
  return tier === "high" ? "5,000 / day" : "500 / day";
}
