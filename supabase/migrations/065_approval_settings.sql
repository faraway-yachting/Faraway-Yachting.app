-- Segregation of duties: require separate approval for journal entries

ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_journal_approval BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS journal_approval_threshold DECIMAL(12,2) DEFAULT 0;
