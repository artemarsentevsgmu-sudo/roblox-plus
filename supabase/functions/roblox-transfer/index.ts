import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchWithCookie(url: string, cookie: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers, redirect: "manual" });
}

async function getCsrfToken(cookie: string): Promise<string | null> {
  try {
    const resp = await fetchWithCookie("https://auth.roblox.com/v2/logout", cookie, {
      method: "POST",
      headers: {},
    });
    return resp.headers.get("x-csrf-token");
  } catch {
    return null;
  }
}

async function resolveUsername(username: string, cookie: string): Promise<number | null> {
  try {
    const resp = await fetchWithCookie("https://users.roblox.com/v1/usernames/users", cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: true,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.data?.[0]?.id) return data.data[0].id;
  } catch {
    // ignore
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cookie, recipientUsername, recipientUserId, amount, accountId } = body;

    if (!cookie || typeof cookie !== "string") {
      return new Response(JSON.stringify({ error: "Cookie is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Valid amount is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanCookie = cookie.trim().replace(/^["']|["']$/g, "");

    let targetUserId = recipientUserId;
    let targetUsername = recipientUsername;

    if (!targetUserId && targetUsername) {
      targetUserId = await resolveUsername(targetUsername, cleanCookie);
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: `Could not find Roblox user: ${targetUsername}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Recipient user ID or username is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csrfToken = await getCsrfToken(cleanCookie);
    if (!csrfToken) {
      return new Response(JSON.stringify({ error: "Failed to get CSRF token. Cookie may be invalid." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transferResp = await fetchWithCookie(
      "https://apis.roblox.com/transfer/v1/robux-transfer/transfer",
      cleanCookie,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({
          recipientUserId: targetUserId,
          amount: amount,
        }),
      }
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!transferResp.ok) {
      let errorBody = "Transfer failed";
      try {
        const errData = await transferResp.json();
        errorBody = errData?.errors?.[0]?.message || errData?.message || `Transfer failed (${transferResp.status})`;
      } catch {
        errorBody = `Transfer failed (${transferResp.status})`;
      }

      if (accountId) {
        await supabase.from("roblox_transfers").insert({
          account_id: accountId,
          recipient_user_id: targetUserId,
          recipient_username: targetUsername || String(targetUserId),
          amount: amount,
          status: "failed",
          error_message: errorBody,
        });
      }

      return new Response(JSON.stringify({ error: errorBody }), {
        status: transferResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let transferData: Record<string, unknown> | null = null;
    try {
      transferData = await transferResp.json();
    } catch {
      // empty body is fine
    }

    if (accountId) {
      await supabase.from("roblox_transfers").insert({
        account_id: accountId,
        recipient_user_id: targetUserId,
        recipient_username: targetUsername || String(targetUserId),
        amount: amount,
        status: "success",
      });

      const { data: account } = await supabase
        .from("roblox_accounts")
        .select("daily_sent, monthly_sent, robux_balance")
        .eq("id", accountId)
        .maybeSingle();

      if (account) {
        await supabase
          .from("roblox_accounts")
          .update({
            daily_sent: (account.daily_sent || 0) + amount,
            monthly_sent: (account.monthly_sent || 0) + amount,
            robux_balance: Math.max(0, (account.robux_balance || 0) - amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);
      }
    }

    return new Response(JSON.stringify({ success: true, data: transferData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
