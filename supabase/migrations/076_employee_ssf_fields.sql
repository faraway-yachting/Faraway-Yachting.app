-- Per-employee SSF control: toggle + optional override amount
ALTER TABLE employees ADD COLUMN ssf_enabled BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN ssf_override NUMERIC(15,2);
