/*
# Create roblox_accounts table (single-tenant, no auth)

1. New Tables
- `roblox_accounts`
  - `id` (uuid, primary key)
  - `roblox_user_id` (bigint, the Roblox user ID of the account)
  - `username` (text, the Roblox username)
  - `display_name` (text, the Roblox display name)
  - `avatar_url` (text, URL to the account's avatar thumbnail)
  - `cookie` (text, the .ROBLOSECURITY cookie value, stored as provided)
  - `robux_balance` (integer, current Robux balance on the account, default 0)
  - `has_roblox_plus` (boolean, whether the account has an active Roblox Plus subscription, default false)
  - `tier` (text, the transfer limit tier: 'high' = 5000/day 10000/month, 'low' = 500/day 1000/month)
  - `daily_limit` (integer, daily transfer limit in Robux, 5000 or 500)
  - `monthly_limit` (integer, monthly transfer limit in Robux, 10000 or 1000)
  - `daily_sent` (integer, Robux sent today via transfers, default 0)
  - `monthly_sent` (integer, Robux sent this month via transfers, default 0)
  - `daily_reset_at` (timestamptz, when the daily limit resets)
  - `monthly_reset_at` (timestamptz, when the monthly limit resets)
  - `last_refreshed_at` (timestamptz, when account info was last refreshed from Roblox API)
  - `status` (text, account status: 'active' or 'invalid' if cookie expired, default 'active')
  - `created_at` (timestamptz, record creation time)
  - `updated_at` (timestamptz, record last update time)
- `roblox_transfers`
  - `id` (uuid, primary key)
  - `account_id` (uuid, FK to roblox_accounts)
  - `recipient_user_id` (bigint, Roblox user ID of the recipient)
  - `recipient_username` (text, Roblox username of the recipient)
  - `amount` (integer, Robux amount transferred)
  - `status` (text, 'success', 'failed')
  - `error_message` (text, error details if failed, nullable)
  - `created_at` (timestamptz, transfer time)
2. Security
- Enable RLS on both tables.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD.
3. Important Notes
- The app has no login screen, so all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared/public within this single-user tool.
- `roblox_transfers.account_id` references `roblox_accounts.id` with ON DELETE CASCADE so transfers are removed when an account is deleted.
*/

CREATE TABLE IF NOT EXISTS roblox_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_user_id bigint NOT NULL,
  username text NOT NULL,
  display_name text,
  avatar_url text,
  cookie text NOT NULL,
  robux_balance integer NOT NULL DEFAULT 0,
  has_roblox_plus boolean NOT NULL DEFAULT false,
  tier text NOT NULL DEFAULT 'low',
  daily_limit integer NOT NULL DEFAULT 500,
  monthly_limit integer NOT NULL DEFAULT 1000,
  daily_sent integer NOT NULL DEFAULT 0,
  monthly_sent integer NOT NULL DEFAULT 0,
  daily_reset_at timestamptz,
  monthly_reset_at timestamptz,
  last_refreshed_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roblox_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roblox_accounts" ON roblox_accounts;
CREATE POLICY "anon_select_roblox_accounts" ON roblox_accounts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roblox_accounts" ON roblox_accounts;
CREATE POLICY "anon_insert_roblox_accounts" ON roblox_accounts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roblox_accounts" ON roblox_accounts;
CREATE POLICY "anon_update_roblox_accounts" ON roblox_accounts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roblox_accounts" ON roblox_accounts;
CREATE POLICY "anon_delete_roblox_accounts" ON roblox_accounts FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS roblox_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES roblox_accounts(id) ON DELETE CASCADE,
  recipient_user_id bigint NOT NULL,
  recipient_username text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roblox_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roblox_transfers" ON roblox_transfers;
CREATE POLICY "anon_select_roblox_transfers" ON roblox_transfers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roblox_transfers" ON roblox_transfers;
CREATE POLICY "anon_insert_roblox_transfers" ON roblox_transfers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roblox_transfers" ON roblox_transfers;
CREATE POLICY "anon_update_roblox_transfers" ON roblox_transfers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roblox_transfers" ON roblox_transfers;
CREATE POLICY "anon_delete_roblox_transfers" ON roblox_transfers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_roblox_transfers_account_id ON roblox_transfers(account_id);
CREATE INDEX IF NOT EXISTS idx_roblox_transfers_created_at ON roblox_transfers(created_at DESC);
