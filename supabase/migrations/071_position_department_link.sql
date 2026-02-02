-- ============================================================================
-- 071: Link positions to departments (dependent dropdown)
-- ============================================================================

-- Add department_id to hr_positions
ALTER TABLE hr_positions ADD COLUMN department_id UUID REFERENCES hr_departments(id);
CREATE INDEX idx_hr_positions_department ON hr_positions(department_id);

-- Map existing positions to departments
UPDATE hr_positions SET department_id = (SELECT id FROM hr_departments WHERE name = 'Operations') WHERE name IN ('Captain', 'Deckhand', 'Engineer', 'Stewardess', 'Chef');
UPDATE hr_positions SET department_id = (SELECT id FROM hr_departments WHERE name = 'Office') WHERE name = 'Office Admin';
UPDATE hr_positions SET department_id = (SELECT id FROM hr_departments WHERE name = 'Sales') WHERE name = 'Sales';
UPDATE hr_positions SET department_id = (SELECT id FROM hr_departments WHERE name = 'Accounting') WHERE name = 'Accountant';
UPDATE hr_positions SET department_id = (SELECT id FROM hr_departments WHERE name = 'Management') WHERE name = 'Manager';
