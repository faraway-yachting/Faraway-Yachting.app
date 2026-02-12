-- Fix: Ensure petty cash wallet holders have company access
-- so they can see projects and companies in dropdowns.
--
-- Migration 103 tightened projects_select and companies_select RLS
-- to require user_has_company_access(). Wallet holders without
-- user_company_access entries can't see any projects.

INSERT INTO user_company_access (user_id, company_id, access_type)
SELECT DISTINCT w.user_id, w.company_id, 'member'
FROM petty_cash_wallets w
WHERE w.user_id IS NOT NULL
  AND w.company_id IS NOT NULL
  AND w.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM user_company_access uca
    WHERE uca.user_id = w.user_id
    AND uca.company_id = w.company_id
  )
ON CONFLICT (user_id, company_id) DO NOTHING;
