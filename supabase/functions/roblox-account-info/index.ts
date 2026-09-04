import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AccountInfo {
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

async function fetchWithCookie(url: string, cookie: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers, redirect: "manual" });
}

async function getAuthenticatedUser(cookie: string): Promise<{ id: number; name: string; displayName: string } | null> {
  try {
    const resp = await fetchWithCookie("https://users.roblox.com/v1/users/authenticated", cookie);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || !data.id) return null;
    return { id: data.id, name: data.name, displayName: data.displayName };
  } catch {
    return null;
  }
}

async function getAvatarUrl(userId: number, cookie: string): Promise<string> {
  try {
    const resp = await fetchWithCookie(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
      cookie
    );
    if (!resp.ok) return "";
    const data = await resp.json();
    if (data?.data?.[0]?.imageUrl) return data.data[0].imageUrl;
  } catch {
    // ignore
  }
  return "";
}

async function getRobuxBalance(cookie: string, userId: number): Promise<number> {
  const endpoints = [
    "https://economy.roblox.com/v1/user/currency",
    `https://economy.roblox.com/v1/users/${userId}/currency`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetchWithCookie(url, cookie, { headers: {} });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (typeof data?.robux === "number") return data.robux;
    } catch {
      // try next
    }
  }

  try {
    const resp = await fetchWithCookie("https://www.roblox.com/mobileapi/userinfo", cookie, { headers: {} });
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data?.RobuxBalance === "number") return data.RobuxBalance;
    }
  } catch {
    // ignore
  }

  return 0;
}

async function getRobloxPlusStatus(cookie: string): Promise<boolean> {
  try {
    const resp = await fetchWithCookie(
      "https://apis.roblox.com/guac-v2/v1/bundles/web-plus-identity-badge",
      cookie,
      { headers: {} }
    );
    if (!resp.ok) return false;
    const data = await resp.json();
    return data?.plusIdentityBadgeEnabled === true;
  } catch {
    return false;
  }
}

async function getTransferLimits(cookie: string): Promise<{
  tier: "high" | "low";
  dailyLimit: number;
  monthlyLimit: number;
  dailySent: number;
  monthlySent: number;
}> {
  try {
    const resp = await fetchWithCookie(
      "https://apis.roblox.com/transfer/v1/robux-transfer/user-transfer-limit",
      cookie,
      { headers: {} }
    );
    if (resp.ok) {
      const data = await resp.json();
      const daily = data?.dailyLimit ?? 0;
      const monthly = data?.monthlyLimit ?? 0;
      if (daily > 0 || monthly > 0) {
        const isHigh = daily >= 5000 || monthly >= 10000;
        return {
          tier: isHigh ? "high" : "low",
          dailyLimit: daily,
          monthlyLimit: monthly,
          dailySent: data?.dailySent ?? data?.dailyUsed ?? 0,
          monthlySent: data?.monthlySent ?? data?.monthlyUsed ?? 0,
        };
      }
    }
  } catch {
    // fall through
  }

  return { tier: "low", dailyLimit: 500, monthlyLimit: 1000, dailySent: 0, monthlySent: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cookie, accountId } = body;

    if (!cookie || typeof cookie !== "string") {
      return new Response(JSON.stringify({ error: "Cookie is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanCookie = cookie.trim().replace(/^["']|["']$/g, "");

    const user = await getAuthenticatedUser(cleanCookie);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid or expired cookie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [avatarUrl, robuxBalance, hasPlus, limits] = await Promise.all([
      getAvatarUrl(user.id, cleanCookie),
      getRobuxBalance(cleanCookie, user.id),
      getRobloxPlusStatus(cleanCookie),
      getTransferLimits(cleanCookie),
    ]);

    const accountInfo: AccountInfo = {
      robloxUserId: user.id,
      username: user.name,
      displayName: user.displayName,
      avatarUrl,
      robuxBalance,
      hasRobloxPlus: hasPlus,
      tier: limits.tier,
      dailyLimit: limits.dailyLimit,
      monthlyLimit: limits.monthlyLimit,
      dailySent: limits.dailySent,
      monthlySent: limits.monthlySent,
    };

    if (accountId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase
        .from("roblox_accounts")
        .update({
          roblox_user_id: accountInfo.robloxUserId,
          username: accountInfo.username,
          display_name: accountInfo.displayName,
          avatar_url: accountInfo.avatarUrl,
          robux_balance: accountInfo.robuxBalance,
          has_roblox_plus: accountInfo.hasRobloxPlus,
          tier: accountInfo.tier,
          daily_limit: accountInfo.dailyLimit,
          monthly_limit: accountInfo.monthlyLimit,
          daily_sent: accountInfo.dailySent,
          monthly_sent: accountInfo.monthlySent,
          last_refreshed_at: new Date().toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
    }

    return new Response(JSON.stringify(accountInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
