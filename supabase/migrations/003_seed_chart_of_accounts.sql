-- ============================================================================
-- Add missing columns and Seed Chart of Accounts with 220 accounts
-- ============================================================================

-- Add missing columns to chart_of_accounts table
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS sub_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Clear any existing data
DELETE FROM chart_of_accounts;

-- Seed all 220 accounts
INSERT INTO chart_of_accounts (code, name, account_type, sub_type, category, normal_balance, description, currency, is_active) VALUES
-- ASSETS - Current Assets - Cash & Equivalents
('1000', 'Petty Cash THB', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Petty Cash THB Asset Current Asset Cash & Equivalents.', 'THB', true),
('1001', 'Petty Cash EUR', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Petty Cash EUR Asset Current Asset Cash & Equivalents.', 'EUR', true),
('1002', 'Petty Cash USD', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Petty Cash USD Asset Current Asset Cash & Equivalents.', 'USD', true),
('1010', 'Bank Account THB', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Bank Account THB Asset Current Asset Cash & Equivalents.', 'THB', true),
('1011', 'Bank Account EUR', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Bank Account EUR Asset Current Asset Cash & Equivalents.', 'EUR', true),
('1012', 'Bank Account USD', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Bank Account USD Asset Current Asset Cash & Equivalents.', 'USD', true),
('1013', 'Bank Account SGD', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Bank Account SGD Asset Current Asset Cash & Equivalents.', 'SGD', true),
('1020', 'Cash on hand THB', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Cash on hand THB Asset Current Asset Cash & Equivalents.', 'THB', true),
('1021', 'Cash on hand EUR', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Cash on hand EUR Asset Current Asset Cash & Equivalents.', 'EUR', true),
('1022', 'Cash on hand USD', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Cash on hand USD Asset Current Asset Cash & Equivalents.', 'USD', true),
('1030', 'Security Deposits Bank Account THB', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Security Deposits Bank Account THB Asset Current Asset Cash & Equivalents.', 'THB', true),
('1031', 'Security Deposits Bank Account EUR', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Security Deposits Bank Account EUR Asset Current Asset Cash & Equivalents.', 'EUR', true),
('1032', 'Security Deposits Bank Account USD', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Security Deposits Bank Account USD Asset Current Asset Cash & Equivalents.', 'USD', true),
('1035', 'Escrow Accounts', 'Asset', 'Current Asset', 'Cash & Equivalents', 'Debit', 'Escrow accounts for client funds', NULL, true),
('1060', 'Short-Term Investments', 'Asset', 'Current Asset', 'Investments & Other', 'Debit', 'Short-Term Investments Asset Current Asset Cash & Equivalents.', NULL, true),

-- ASSETS - Current Assets - Receivables
('1140', 'Credit Card Receivables', 'Asset', 'Current Asset', 'Receivables', 'Debit', 'Credit Card Receivables Asset Current Asset Receivables.', NULL, true),
('1150', 'Employee Advances', 'Asset', 'Current Asset', 'Receivables', 'Debit', 'Employee Advances Asset Current Asset Receivables.', NULL, true),
('1160', 'Insurance Claims Receivable', 'Asset', 'Current Asset', 'Receivables', 'Debit', 'Insurance Claims Receivable Asset Current Asset Receivables.', NULL, true),
('1170', 'VAT Receivable', 'Asset', 'Current Asset', 'Receivables', 'Debit', 'VAT Receivable Asset Current Asset Receivables.', NULL, true),
('1180', 'Other Receivables', 'Asset', 'Current Asset', 'Receivables', 'Debit', 'Other Receivables Asset Current Asset Receivables.', NULL, true),

-- ASSETS - Current Assets - Inventory & Prepaid
('1200', 'Inventory', 'Asset', 'Current Asset', 'Inventory', 'Debit', 'Inventory Asset Current Asset Inventory.', NULL, true),
('1300', 'Prepaid Expenses Asset Current Asset Prepaid Expenses', 'Asset', 'Current Asset', 'Prepaid Expenses', 'Debit', 'Prepaid Expenses Asset Current Asset Prepaid Expenses.', NULL, true),

-- ASSETS - Non-Current Assets - Property & Equipment
('1400', 'Vessels', 'Asset', 'Non-Current Asset', 'Investments & Other', 'Debit', 'Vessels Asset Non-Current Asset Vessels.', NULL, true),
('1500', 'Boat Equipment', 'Asset', 'Non-Current Asset', 'Property & Equipment', 'Debit', 'Boat Equipment Asset Non-Current Asset Property & Equipment.', NULL, true),
('1510', 'Office Equipment', 'Asset', 'Non-Current Asset', 'Property & Equipment', 'Debit', 'Office Equipment Asset Non-Current Asset Property & Equipment.', NULL, true),
('1560', 'Vehicles', 'Asset', 'Non-Current Asset', 'Property & Equipment', 'Debit', 'Vehicles Asset Non-Current Asset Property & Equipment.', NULL, true),

-- ASSETS - Non-Current Assets - Intangible Assets
('1610', 'Trademarks & Brand Names', 'Asset', 'Non-Current Asset', 'Intangible Assets', 'Debit', 'Trademarks & Brand Names Asset Non-Current Asset Intangible Assets.', NULL, true),
('1620', 'Charter Licenses & Permits', 'Asset', 'Non-Current Asset', 'Intangible Assets', 'Debit', 'Charter Licenses & Permits Asset Non-Current Asset Intangible Assets.', NULL, true),
('1630', 'Software & Technology', 'Asset', 'Non-Current Asset', 'Intangible Assets', 'Debit', 'Software & Technology Asset Non-Current Asset Intangible Assets.', NULL, true),
('1710', 'Goodwill', 'Asset', 'Non-Current Asset', 'Intangible Assets', 'Debit', 'Goodwill from business acquisitions', NULL, true),

-- ASSETS - Non-Current Assets - Investments & Other
('1730', 'Security Deposits Paid', 'Asset', 'Non-Current Asset', 'Investments & Other', 'Debit', 'Security Deposits Paid Asset Non-Current Asset Investments & Other.', NULL, true),
('1740', 'Deferred Tax Assets', 'Asset', 'Non-Current Asset', 'Investments & Other', 'Debit', 'Deferred Tax Assets Asset Non-Current Asset Investments & Other.', NULL, true),
('1760', 'Long-Term Investments', 'Asset', 'Non-Current Asset', 'Investments & Other', 'Debit', 'Long-Term Investments.', NULL, true),
('1790', 'Other Non-Current', 'Asset', 'Non-Current Asset', 'Investments & Other', 'Debit', 'Other Non-Current Assets Asset Non-Current Asset Investments & Other.', NULL, true),

-- LIABILITIES - Current Liabilities - Payables
('2010', 'Accounts Payable - Fuel Suppliers', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Accounts Payable - Fuel Suppliers Liability Current Liability Payables.', NULL, true),
('2020', 'Accounts Payable - Provisions/Catering', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Accounts Payable - Provisions/Catering Liability Current Liability Payables.', NULL, true),
('2030', 'Accounts Payable - Marina & Port Fees', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Accounts Payable - Marina & Port Fees Liability Current Liability Payables.', NULL, true),
('2040', 'Accounts Payable - Maintenance & Repairs', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Accounts Payable - Maintenance & Repairs Liability Current Liability Payables.', NULL, true),
('2050', 'Accounts Payable - Professional Services', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Accounts Payable - Professional Services Liability Current Liability Payables.', NULL, true),
('2060', 'Credit Cards Payable', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Credit Cards Payable Liability Current Liability Payables.', NULL, true),
('2070', 'Intercompany Payables', 'Liability', 'Current Liability', 'Payables', 'Credit', 'Intercompany Payables Liability Current Liability Payables.', NULL, true),

-- LIABILITIES - Current Liabilities - Accrued Expenses
('2100', 'Accrued Wages & Salaries', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Wages & Salaries Liability Current Liability Accrued Expenses.', NULL, true),
('2110', 'Accrued Crew Wages', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Crew Wages Liability Current Liability Accrued Expenses.', NULL, true),
('2130', 'Accrued Bonuses', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Bonuses Liability Current Liability Accrued Expenses.', NULL, true),
('2140', 'Accrued Interest', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Interest Liability Current Liability Accrued Expenses.', NULL, true),
('2150', 'Accrued Professional Fees', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Professional Fees Liability Current Liability Accrued Expenses.', NULL, true),
('2160', 'Accrued Utilities', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Utilities Liability Current Liability Accrued Expenses.', NULL, true),
('2170', 'Accrued Repairs & Maintenance', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Accrued Repairs & Maintenance Liability Current Liability Accrued Expenses.', NULL, true),
('2190', 'Other Accrued Expenses', 'Liability', 'Current Liability', 'Accrued Expenses', 'Credit', 'Other Accrued Expenses Liability Current Liability Accrued Expenses.', NULL, true),

-- LIABILITIES - Current Liabilities - Taxes & Withholdings
('2200', 'VAT/GST Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'VAT/GST Payable Liability Current Liability Taxes & Withholdings.', NULL, true),
('2210', 'Income Tax Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'Income Tax Payable Liability Current Liability Taxes & Withholdings.', NULL, true),
('2220', 'Employee Income Tax Withholding Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'Employee income tax withheld pending remittance', NULL, true),
('2230', 'Social Security Contributions Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'Social Security Contributions Payable Liability Current Liability Taxes & Withholdings.', NULL, true),
('2240', 'Withholdings Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'Withholdings Payable Liability Current Liability Taxes & Withholdings.', NULL, true),
('2290', 'Other Taxes Payable', 'Liability', 'Current Liability', 'Taxes & Withholdings', 'Credit', 'Other Taxes Payable Liability Current Liability Taxes & Withholdings.', NULL, true),

-- LIABILITIES - Current Liabilities - Deferred Revenue & Deposits
('2300', 'Charter Deposits Received', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Deferred Charter Revenue Liability Current Liability Deferred Revenue & Deposits.', NULL, true),
('2330', 'Security Deposits Held', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Security Deposits Held Liability Current Liability Deferred Revenue & Deposits.', NULL, true),
('2340', 'Gift Cards/Vouchers Outstanding', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Gift Cards/Vouchers Outstanding Liability Current Liability Deferred Revenue & Deposits.', NULL, true),
('2350', 'Deferred Commission Income', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Deferred Commission Income Liability Current Liability Deferred Revenue & Deposits.', NULL, true),
('2390', 'Other Deferred Revenue', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Other Deferred Revenue Liability Current Liability Deferred Revenue & Deposits.', NULL, true),

-- LIABILITIES - Current Liabilities - Short-Term Debt
('2400', 'Short-Term Bank Loans', 'Liability', 'Current Liability', 'Short-Term Debt', 'Credit', 'Short-Term Bank Loans Liability Current Liability Short-Term Debt.', NULL, true),
('2410', 'Current Portion of Long-Term Debt', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Current Portion of Long-Term Debt Liability Current Liability Short-Term Debt.', NULL, true),
('2420', 'Current Portion of Vessel Financing', 'Liability', 'Current Liability', 'Short-Term Debt', 'Credit', 'Current Portion of Vessel Financing Liability Current Liability Short-Term Debt.', NULL, true),
('2430', 'Lines of Credit Liability Current', 'Liability', 'Current Liability', 'Short-Term Debt', 'Credit', 'Lines of Credit Liability Current Liability Short-Term Debt.', NULL, true),
('2490', 'Other Short-Term Borrowings', 'Liability', 'Current Liability', 'Short-Term Debt', 'Credit', 'Other Short-Term Borrowings Liability Current Liability Short-Term Debt.', NULL, true),

-- LIABILITIES - Non-Current Liabilities - Long-Term Debt
('2500', 'Long-Term Bank Loans', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Long-Term Bank Loans Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2510', 'Vessel Mortgage Loans', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Vessel Mortgage Loans Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2520', 'Equipment Financing', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Equipment Financing Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2530', 'Bonds Payable', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Bonds Payable Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2540', 'Notes Payable - Long-Term', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Notes Payable - Long-Term Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2550', 'Shareholder Loans Liability', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Shareholder Loans Liability Non-Current Liability Long-Term Debt.', NULL, true),
('2590', 'Other Long-Term Debt Liability', 'Liability', 'Non-Current Liability', 'Long-Term Debt', 'Credit', 'Other Long-Term Debt Liability Non-Current Liability Long-Term Debt.', NULL, true),

-- LIABILITIES - Non-Current Liabilities - Other
('2600', 'Deferred Tax Liabilities', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Deferred Tax Liabilities Liability Non-Current Liability Other Non-Current Liabilities.', NULL, true),
('2610', 'Long-Term Security Deposits', 'Liability', 'Current Liability', 'Deferred Revenue & Deposits', 'Credit', 'Long-Term Security Deposits Liability Non-Current Liability Other Non-Current Liabilities.', NULL, true),
('2630', 'Provisions for Vessel Overhauls Liability', 'Liability', 'Non-Current Liability', 'Other Non-Current Liabilities', 'Credit', 'Provisions for Vessel Overhauls Liability Non-Current Liability Other Non-Current Liabilities.', NULL, true),
('2640', 'Environmental Provisions', 'Liability', 'Non-Current Liability', 'Other Non-Current Liabilities', 'Credit', 'Environmental Provisions Liability Non-Current Liability Other Non-Current Liabilities.', NULL, true),
('2690', 'Other Non-Current Liabilities', 'Liability', 'Non-Current Liability', 'Other Non-Current Liabilities', 'Credit', 'Other Non-Current Liabilities Liability Non-Current Liability Other Non-Current Liabilities.', NULL, true),

-- EQUITY - Share Capital
('3000', 'Ordinary Share Capital', 'Equity', 'Share Capital', 'Share Capital', 'Credit', 'Ordinary Share Capital Equity Share Capital Share Capital.', NULL, true),
('3010', 'Preference Share Capital', 'Equity', 'Share Capital', 'Share Capital', 'Credit', 'Preference Share Capital Equity Share Capital Share Capital.', NULL, true),
('3020', 'Share Premium/Additional Paid-In Capital', 'Equity', 'Share Capital', 'Share Capital', 'Credit', 'Share Premium/Additional Paid-In Capital Equity Share Capital Share Capital.', NULL, true),
('3030', 'Treasury Shares', 'Equity', 'Share Capital', 'Share Capital', 'Debit', 'Treasury Shares Equity Share Capital Share Capital.', NULL, true),

-- EQUITY - Reserves
('3100', 'Legal Reserve', 'Equity', 'Reserves', 'Reserves', 'Credit', 'Legal Reserve Equity Reserves Reserves.', NULL, true),
('3110', 'Capital Reserve', 'Equity', 'Reserves', 'Reserves', 'Credit', 'Capital Reserve Equity Reserves Reserves.', NULL, true),
('3120', 'Revaluation Reserve Equity', 'Equity', 'Reserves', 'Reserves', 'Credit', 'Revaluation Reserve Equity Reserves Reserves.', NULL, true),
('3130', 'Foreign Currency Translation Reserve', 'Equity', 'Reserves', 'Reserves', 'Credit', 'Foreign Currency Translation Reserve Equity Reserves Reserves.', NULL, true),
('3150', 'Share-Based Payment Reserve', 'Equity', 'Reserves', 'Reserves', 'Credit', 'Share-Based Payment Reserve Equity Reserves Reserves.', NULL, true),

-- EQUITY - Retained Earnings
('3200', 'Retained Earnings - Prior Years', 'Equity', 'Retained Earnings', 'Retained Earnings', 'Credit', 'Retained Earnings - Prior Years Equity Retained Earnings Retained Earnings.', NULL, true),
('3210', 'Current Year Earnings', 'Equity', 'Retained Earnings', 'Retained Earnings', 'Credit', 'Current Year Earnings Equity Retained Earnings Retained Earnings.', NULL, true),
('3220', 'Dividends Declared', 'Equity', 'Retained Earnings', 'Retained Earnings', 'Debit', 'Dividends Declared Equity Retained Earnings Retained Earnings.', NULL, true),

-- EQUITY - Other
('3310', 'Owner''s Drawings', 'Equity', 'Other Equity', 'Other Equity', 'Debit', 'Owner''s Drawings Equity Other Equity Other Equity.', NULL, true),
('3320', 'Owner''s Contributions', 'Equity', 'Other Equity', 'Other Equity', 'Credit', 'Owner''s Contributions Equity Other Equity Other Equity.', NULL, true),

-- REVENUE - Operating Revenue - Charter Revenue
('4010', 'Charter Revenue - Day Charters', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Charter Revenue - Day Charters Revenue Operating Revenue Charter Revenue.', NULL, true),
('4020', 'Charter Revenue - Overnight charter', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Charter Revenue - Overnight charter Revenue Operating Revenue Charter Revenue.', NULL, true),
('4030', 'Charter Revenue - Cabin charter', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Charter Revenue - Cabin charter.', NULL, true),
('4040', 'Other charter Revenue', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Other Revenue.', NULL, true),
('4050', 'Commission Revenue - Bareboat charter', 'Revenue', 'Operating Revenue', 'Commission Revenue', 'Credit', 'Commission Revenue - Bareboat charter Commission Revenue Operating Revenue Charter Revenue.', NULL, true),
('4060', 'Commission Revenue - Crewed charter', 'Revenue', 'Operating Revenue', 'Commission Revenue', 'Credit', 'Commission Revenue - Crewed charter Commission Revenue Operating Revenue Charter Revenue.', NULL, true),
('4070', 'Commission Revenue - Outsouce services Comission', 'Revenue', 'Operating Revenue', 'Commission Revenue', 'Credit', 'Commission Revenue - Outsouce services Comission.', NULL, true),
('4080', 'Other commission', 'Revenue', 'Operating Revenue', 'Commission Revenue', 'Credit', 'Other commission.', NULL, true),
('4090', 'Charter Cancellation Fees', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Charter Cancellation Fees Revenue Operating Revenue Charter Revenue.', NULL, true),
('4095', 'Charter Amendment Fees', 'Revenue', 'Operating Revenue', 'Charter Revenue', 'Credit', 'Charter Amendment Fees Revenue Operating Revenue Charter Revenue.', NULL, true),

-- REVENUE - Operating Revenue - Ancillary Revenue
('4100', 'Food & Beverage Revenue', 'Revenue', 'Operating Revenue', 'Ancillary Revenue', 'Credit', 'Food & Beverage Revenue Revenue Operating Revenue Ancillary Revenue.', NULL, true),
('4190', 'Merchandise Sales', 'Revenue', 'Operating Revenue', 'Ancillary Revenue', 'Credit', 'Merchandise Sales Revenue Operating Revenue Ancillary Revenue.', NULL, true),

-- REVENUE - Operating Revenue - Management & Brokerage
('4300', 'Yacht Management Fees', 'Revenue', 'Operating Revenue', 'Management & Brokerage Revenue', 'Credit', 'Yacht Management Fees Revenue Operating Revenue Management & Brokerage Revenue.', NULL, true),
('4320', 'Yacht Sales Commissions', 'Revenue', 'Operating Revenue', 'Management & Brokerage Revenue', 'Credit', 'Yacht Sales Commissions Revenue Operating Revenue Management & Brokerage Revenue.', NULL, true),
('4330', 'Consultancy Fees Revenue', 'Revenue', 'Operating Revenue', 'Management & Brokerage Revenue', 'Credit', 'Consultancy Fees Revenue Operating Revenue Management & Brokerage Revenue.', NULL, true),

-- REVENUE - Operating Revenue - Other Operating Revenue
('4410', 'Insurance Recoveries Revenue', 'Revenue', 'Operating Revenue', 'Other Operating Revenue', 'Credit', 'Insurance Recoveries Revenue Operating Revenue Other Operating Revenue.', NULL, true),
('4420', 'Damage Deposit Forfeitures', 'Revenue', 'Operating Revenue', 'Other Operating Revenue', 'Credit', 'Damage Deposit Forfeitures Revenue Operating Revenue Other Operating Revenue.', NULL, true),
('4430', 'Late Payment Fees', 'Revenue', 'Operating Revenue', 'Other Operating Revenue', 'Credit', 'Late Payment Fees Revenue Operating Revenue Other Operating Revenue.', NULL, true),
('4440', 'Training & Certification Revenue', 'Revenue', 'Operating Revenue', 'Other Operating Revenue', 'Credit', 'Training & Certification Revenue Revenue Operating Revenue Other Operating Revenue.', NULL, true),
('4490', 'Other Operating Revenue', 'Revenue', 'Operating Revenue', 'Other Operating Revenue', 'Credit', 'Other Operating Revenue Revenue Operating Revenue Other Operating Revenue.', NULL, true),

-- REVENUE - Non-Operating Revenue
('4500', 'Interest Income', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Interest Income Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),
('4510', 'Dividend Income', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Dividend Income Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),
('4520', 'Foreign Exchange Gains Revenue', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Foreign Exchange Gains Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),
('4530', 'Gain on Sale of Assets Revenue', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Gain on Sale of Assets Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),
('4540', 'Rental Income - Property Revenue', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Rental Income - Property Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),
('4590', 'Other Non-Operating Income', 'Revenue', 'Non-Operating Revenue', 'Non-Operating Revenue', 'Credit', 'Other Non-Operating Income Revenue Non-Operating RevenueNon-Operating Revenue.', NULL, true),

-- EXPENSES - Direct Cost of Sales - Vessel Operating Costs
('5000', 'Fuel', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs', 'Debit', 'Fuel Cost of Sales Direct Cost Vessel Operating Costs - Fuel.', NULL, true),
('5100', 'Boat Insurance', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs', 'Debit', 'Insurance Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5110', 'Permits & License Fees for boat', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs', 'Debit', 'Permits & License Fees Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5120', 'Marina fee', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs', 'Debit', 'Marina fee Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),

-- EXPENSES - Direct Cost of Sales - Crew Expenses
('5130', 'Boat Team Salary', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Boat Team Salary Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5160', 'Sales commission - Boat team', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Sales commission - Boat team Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5170', 'Freelance Staff - boat team', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Freelance Staff - boat team.', NULL, true),
('5172', 'Crew Bonuses', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Bonuses.', NULL, true),
('5173', 'Crew Overtime', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Overtime.', NULL, true),
('5174', 'Crew Gratuity Pass-Through', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Gratuity Pass-Through.', NULL, true),
('5190', 'Crew Benefits - Health Insurance', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Benefits - Health Insurance Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5192', 'Crew Travel & Repatriation', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Travel & Repatriation Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5193', 'Crew Uniforms', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Uniforms Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5194', 'Crew Training & Certification', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Training & Certification Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),
('5195', 'Crew Expense', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Crew', 'Debit', 'Crew Expense Cost of Sales Direct Cost Vessel Operating Costs - Crew.', NULL, true),

-- EXPENSES - Direct Cost of Sales - Provisions
('5200', 'Guest Provisions - Food and Baverage', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Provisions', 'Debit', 'Guest Provisions - Food and Baverage Cost of Sales Direct Cost Vessel Operating Costs - Provisions.', NULL, true),
('5250', 'Laundry Service', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Provisions', 'Debit', 'Laundry Service Cost of Sales Direct Cost Vessel Operating Costs - Provisions.', NULL, true),
('5290', 'Other Provisions', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Provisions', 'Debit', 'Other Provisions Cost of Sales Direct Cost Vessel Operating Costs - Provisions.', NULL, true),
('5295', 'Guest Entertainment & Activities', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Provisions', 'Debit', 'Entertainment and activities for charter guests', NULL, true),

-- EXPENSES - Direct Cost of Sales - Port & Marina
('5350', 'Customs & Immigration Fees', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Port & Marina', 'Debit', 'Customs & Immigration Fees Cost of Sales Direct Cost Vessel Operating Costs - Port & Marina.', NULL, true),

-- EXPENSES - Direct Cost of Sales - Maintenance
('5500', 'Boat Maintenance & Repairs - Regular', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Maintenance', 'Debit', 'Boat Maintenance & Repairs Regular Cost of Sales Direct Cost Vessel Operating Costs - Maintenance.', NULL, true),
('5510', 'Boat Maintenance & Repairs - Non-Regular', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Maintenance', 'Debit', 'Boat Maintenance & Repairs Non-Regular Cost of Sales Direct Cost Vessel Operating Costs - Maintenance.', NULL, true),
('5520', 'Boat Maintenance & Repairs at Shipyard', 'Expense', 'Direct Cost of Sales', 'Vessel Operating Costs - Maintenance', 'Debit', 'Boat Maintenance & Repairs at Shipyard Cost of Sales Direct Cost Vessel Operating Costs - Maintenance.', NULL, true),

-- EXPENSES - Direct Cost of Sales - External Services
('5530', 'Charter Cost – External Boat / Service', 'Expense', 'Direct Cost of Sales', 'External Boat / Service', 'Debit', 'Charter Cost – External Boat / Subcontracted Charter', NULL, true),
('5600', 'Salaries - Freelance', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Office Maintenance & Repairs Cost of Sales Direct Cost Vessel Operating Costs - Maintenance.', NULL, true),

-- EXPENSES - Operating Expense - Personnel Expenses
('6000', 'Salaries - Management', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Salaries - Management Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6010', 'Salaries - Administration', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Salaries - Administration Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6020', 'Salaries - Sales & Marketing', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Salaries - Sales & Marketing Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6040', 'Salaries - Finance & Accounting', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Salaries - Finance & Accounting Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6060', 'Employee Benefits', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Employee Benefits - Health Insurance Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6065', 'Employee Recruitment Costs', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Costs for recruiting and hiring employees', NULL, true),
('6080', 'TeamTraining & Development', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Staff Training & Development Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),
('6090', 'Team Travel & Entertainment', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Staff Travel & Entertainment Expense Operating Expense Personnel Expenses - Shore Staff.', NULL, true),

-- EXPENSES - Operating Expense - Office & Administrative
('6100', 'Office Rent', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Office Rent Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6110', 'Office Utilities', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Office Utilities Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6120', 'Office Supplies', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Office Supplies Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6130', 'Postage & Courier', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Postage & Courier Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6140', 'Telephone & Internet', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Telephone & Internet Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6150', 'Office Equipment Rental', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Office Equipment Rental Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6160', 'Office Maintenance', 'Expense', 'Operating Expense', 'Office Maintenance', 'Debit', 'Office Maintenance Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6170', 'Social Security Contributions', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Security Services Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6180', 'Cleaning Services', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Cleaning Services Expense Operating Expense Office & Administrative Expenses.', NULL, true),
('6190', 'Other Administrative Expenses', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Other Administrative Expenses Expense Operating Expense Office & Administrative Expenses.', NULL, true),

-- EXPENSES - Operating Expense - Professional Services
('6200', 'Legal Fees Expense', 'Expense', 'Operating Expense', 'Professional Services', 'Debit', 'Legal Fees Expense Operating Expense Professional Services.', NULL, true),
('6210', 'Accounting & Audit Fees', 'Expense', 'Operating Expense', 'Professional Services', 'Debit', 'Accounting & Audit Fees Expense Operating Expense Professional Services.', NULL, true),
('6220', 'Tax Advisory Fees', 'Expense', 'Operating Expense', 'Professional Services', 'Debit', 'Tax Advisory Fees Expense Operating Expense Professional Services.', NULL, true),
('6230', 'Consulting Fee', 'Expense', 'Operating Expense', 'Professional Services', 'Debit', 'Consulting Fees Expense Operating Expense Professional Services.', NULL, true),
('6240', 'IT Services & Support', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'IT Services & Support Expense Operating Expense Professional Services.', NULL, true),
('6290', 'Other Professional Fees', 'Expense', 'Operating Expense', 'Professional Services', 'Debit', 'Other Professional Fees Expense Operating Expense Professional Services.', NULL, true),

-- EXPENSES - Operating Expense - Marketing & Sales
('6300', 'Advertising - Digital', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Advertising - Digital Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6310', 'Advertising - Goodgle Ad', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Advertising - Print Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6320', 'Website Development & Hosting', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Website Development & Hosting Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6330', 'SEO & Digital Marketing', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'SEO & Digital Marketing Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6340', 'Social Media Marketing', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Social Media Marketing Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6350', 'Brochures & Print', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Brochures & Print Materials Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6360', 'Boat Shows & Exhibitions', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Boat Shows & Exhibitions Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6370', 'Photography & Videography', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Photography & Videography Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6380', 'PR & Media Relations', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'PR & Media Relations Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6385', 'Sponsorships', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Sponsorships Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6390', 'Guests Entertainment', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Client Entertainment Expense Operating Expense Marketing & Sales Expenses.', NULL, true),
('6395', 'Promotional Items', 'Expense', 'Operating Expense', 'Marketing & Sales Expenses', 'Debit', 'Promotional Items Expense Operating Expense Marketing & Sales Expenses.', NULL, true),

-- EXPENSES - Operating Expense - Technology & Software
('6400', 'Software Subscriptions - Booking and Operating System', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Software Subscriptions - Booking System Expense Operating Expense Technology & Software.', NULL, true),
('6410', 'Software Subscriptions - AI tools', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Software Subscriptions - CRM Expense Operating Expense Technology & Software.', NULL, true),
('6420', 'Software Subscriptions - Accounting', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Software Subscriptions - Accounting Expense Operating Expense Technology & Software.', NULL, true),
('6430', 'Software Subscriptions - General', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Software Subscriptions - Fleet Management Expense Operating Expense Technology & Software.', NULL, true),
('6440', 'Cloud Services & Hosting', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Cloud Services & Hosting Expense Operating Expense Technology & Software.', NULL, true),
('6450', 'Hardware Maintenance', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Hardware Maintenance Expense Operating Expense Technology & Software.', NULL, true),
('6460', 'Cybersecurity', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Cybersecurity Expense Operating Expense Technology & Software.', NULL, true),
('6490', 'Other Technology Cost', 'Expense', 'Operating Expense', 'Technology & Software', 'Debit', 'Other Technology Costs Expense Operating Expense Technology & Software.', NULL, true),

-- EXPENSES - Operating Expense - Insurance
('6500', 'General Liability Insurance', 'Expense', 'Operating Expense', 'Insurance - Business', 'Debit', 'General Liability Insurance Expense Operating Expense Insurance - Business.', NULL, true),
('6505', 'Directors & Officers Insurance', 'Expense', 'Operating Expense', 'Insurance - Business', 'Debit', 'Insurance coverage for directors and officers', NULL, true),
('6530', 'Property Insurance', 'Expense', 'Operating Expense', 'Insurance - Business', 'Debit', 'Property Insurance Expense Operating Expense Insurance - Business.', NULL, true),
('6550', 'Cyber Liability Insurance', 'Expense', 'Operating Expense', 'Insurance - Business', 'Debit', 'Cyber Liability Insurance Expense Operating Expense Insurance - Business.', NULL, true),
('6590', 'Other Business Insurance', 'Expense', 'Operating Expense', 'Insurance - Business', 'Debit', 'Other Business Insurance Expense Operating Expense Insurance - Business.', NULL, true),

-- EXPENSES - Operating Expense - Depreciation & Amortization
('6600', 'Depreciation - Vessels', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Depreciation - Vessels Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6610', 'Depreciation - Vessel Equipment', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Depreciation - Vessel Equipment Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6620', 'Depreciation - Buildings', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Depreciation - Buildings Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6630', 'Depreciation - Office Equipment', 'Expense', 'Operating Expense', 'Office & Administrative Expenses', 'Debit', 'Depreciation - Office Equipment Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6640', 'Depreciation - Vehicles', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Depreciation - Vehicles Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6650', 'Depreciation - Right-of-Use Assets', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Depreciation - Right-of-Use Assets Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6660', 'Amortization - Intangible Assets', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Amortization - Intangible Assets Expense Operating Expense Depreciation & Amortization.', NULL, true),
('6670', 'Amortization - Software Expense', 'Expense', 'Operating Expense', 'Depreciation & Amortization', 'Debit', 'Amortization - Software Expense Operating Expense Depreciation & Amortization.', NULL, true),

-- EXPENSES - Operating Expense - Other Operating Expenses
('6700', 'Bank Charges & Fees Expense', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Bank Charges & Fees Expense Operating Expense Other Operating Expenses.', NULL, true),
('6710', 'Credit Card Processing Fees', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Credit Card Processing Fees Expense Operating Expense Other Operating Expenses.', NULL, true),
('6720', 'Foreign Exchange Transaction Costs', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Foreign Exchange Transaction Costs Expense Operating Expense Other Operating Expenses.', NULL, true),
('6740', 'Licenses & Permits - Business', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Licenses & Permits - Business Expense Operating Expense Other Operating Expenses.', NULL, true),
('6760', 'Charitable Donations', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Charitable Donations Expense Operating Expense Other Operating Expenses.', NULL, true),
('6770', 'Miscellaneous Expenses', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Miscellaneous Expenses Expense Operating Expense Other Operating Expenses.', NULL, true),
('6790', 'Other Operating Expenses', 'Expense', 'Operating Expense', 'Other Operating Expenses', 'Debit', 'Other Operating Expenses Expense Operating Expense Other Operating Expenses.', NULL, true),

-- EXPENSES - Finance Costs
('7000', 'Interest Expense - Bank Loans', 'Expense', 'Finance Costs', 'Finance Costs', 'Debit', 'Interest Expense - Bank Loans Other Expense Finance Costs Finance Costs.', NULL, true),
('7010', 'Interest Expense - Vessel Financing', 'Expense', 'Finance Costs', 'Finance Costs', 'Debit', 'Interest Expense - Vessel Financing Other Expense Finance Costs Finance Costs.', NULL, true),
('7020', 'Interest Expense - Lease Liabilities', 'Expense', 'Finance Costs', 'Finance Costs', 'Debit', 'Interest Expense - Lease Liabilities Other Expense Finance Costs Finance Costs.', NULL, true),
('7030', 'Interest Expense - Overdrafts', 'Expense', 'Finance Costs', 'Finance Costs', 'Debit', 'Interest Expense - Overdrafts Other Expense Finance Costs Finance Costs.', NULL, true),
('7090', 'Other Finance Costs', 'Expense', 'Finance Costs', 'Finance Costs', 'Debit', 'Other Finance Costs Other Expense Finance Costs Finance Costs.', NULL, true),

-- EXPENSES - Non-Operating Expenses
('7100', 'Foreign Exchange Losses', 'Expense', 'Non-Operating Expense', 'Non-Operating Expenses', 'Debit', 'Foreign Exchange Losses Other Expense Non-Operating ExpenseNon-Operating Expenses.', NULL, true),
('7110', 'Loss on Sale of Assets', 'Expense', 'Non-Operating Expense', 'Non-Operating Expenses', 'Debit', 'Loss on Sale of Assets Other Expense Non-Operating ExpenseNon-Operating Expenses.', NULL, true),
('7160', 'Environmental Remediation', 'Expense', 'Non-Operating Expense', 'Non-Operating Expenses', 'Debit', 'Environmental Remediation Other Expense Non-Operating ExpenseNon-Operating Expenses.', NULL, true),
('7190', 'Other Non-Operating Expenses', 'Expense', 'Non-Operating Expense', 'Non-Operating Expenses', 'Debit', 'Other Non-Operating Expenses Other Expense Non-Operating ExpenseNon-Operating Expenses.', NULL, true),

-- EXPENSES - Income Tax
('8000', 'Current Income Tax', 'Expense', 'Income Tax', 'Income Tax', 'Debit', 'Current Income Tax Expense Tax Income Tax Income Tax.', NULL, true),
('8010', 'Deferred Income Tax', 'Expense', 'Income Tax', 'Income Tax', 'Debit', 'Deferred Income Tax Expense/(Benefit) Tax Income Tax Income Tax.', NULL, true),
('8020', 'Prior Year Tax Adjustments Tax Income', 'Expense', 'Income Tax', 'Income Tax', 'Debit', 'Prior Year Tax Adjustments Tax Income Tax Income Tax.', NULL, true),
('8110', 'Withholding Tax Expense', 'Expense', 'Other Tax', 'Other Taxes', 'Debit', 'Withholding Tax Expense Tax Other Tax Other Taxes.', NULL, true),
('8190', 'Other Tax Expenses', 'Expense', 'Other Tax', 'Other Taxes', 'Debit', 'Other Tax Expenses Tax Other Tax Other Taxes.', NULL, true);

-- ============================================================================
-- Done! 220 accounts seeded
-- ============================================================================
