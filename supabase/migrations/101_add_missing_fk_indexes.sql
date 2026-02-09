-- Migration 101: Add Missing Foreign Key Indexes
-- Addresses Supabase linter warning: unindexed_foreign_keys
-- Foreign key columns without covering indexes cause slow JOINs and CASCADE deletes.
-- All indexes use IF NOT EXISTS to be idempotent.

-- ============================================================================
-- accounting_events
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_accounting_events_created_by ON accounting_events(created_by);

-- ============================================================================
-- bank_feed_lines
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bank_feed_lines_project_id ON bank_feed_lines(project_id);

-- ============================================================================
-- bank_matches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bank_matches_project_id ON bank_matches(project_id);

-- ============================================================================
-- beam_merchant_accounts
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_beam_merchant_accounts_created_by ON beam_merchant_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_beam_merchant_accounts_settlement_bank_account_id ON beam_merchant_accounts(settlement_bank_account_id);

-- ============================================================================
-- beam_transactions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_beam_transactions_imported_by ON beam_transactions(imported_by);

-- ============================================================================
-- booking_agencies
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_booking_agencies_created_by ON booking_agencies(created_by);

-- ============================================================================
-- booking_payments
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_booking_payments_bank_account_id ON booking_payments(bank_account_id);

-- ============================================================================
-- bookings
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_receipt_id ON bookings(deposit_receipt_id);
CREATE INDEX IF NOT EXISTS idx_bookings_final_receipt_id ON bookings(final_receipt_id);
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_linked_expense_id ON bookings(linked_expense_id);
CREATE INDEX IF NOT EXISTS idx_bookings_meet_greeter_id ON bookings(meet_greeter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON bookings(updated_by);

-- ============================================================================
-- cash_collections
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cash_collections_confirmed_by ON cash_collections(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_cash_collections_handed_over_to ON cash_collections(handed_over_to);

-- ============================================================================
-- commission_records
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_commission_records_created_by ON commission_records(created_by);
CREATE INDEX IF NOT EXISTS idx_commission_records_paid_by ON commission_records(paid_by);

-- ============================================================================
-- employee_documents
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employee_documents_uploaded_by ON employee_documents(uploaded_by);

-- ============================================================================
-- employees
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);

-- ============================================================================
-- expenses
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- ============================================================================
-- external_boats
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_external_boats_contact_id ON external_boats(contact_id);
CREATE INDEX IF NOT EXISTS idx_external_boats_created_by ON external_boats(created_by);

-- ============================================================================
-- financial_periods
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_financial_periods_closed_by ON financial_periods(closed_by);

-- ============================================================================
-- intercompany_charter_fees
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_intercompany_charter_fees_agency_company_id ON intercompany_charter_fees(agency_company_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_charter_fees_project_id ON intercompany_charter_fees(project_id);

-- ============================================================================
-- invoices
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- ============================================================================
-- journal_entries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by ON journal_entries(created_by);

-- ============================================================================
-- leave_balances
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type_id ON leave_balances(leave_type_id);

-- ============================================================================
-- leave_policies
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leave_policies_leave_type_id ON leave_policies(leave_type_id);

-- ============================================================================
-- leave_requests
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_by ON leave_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by ON leave_requests(rejected_by);

-- ============================================================================
-- notifications
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON notifications(target_user_id);

-- ============================================================================
-- payroll_runs
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payroll_runs_approved_by ON payroll_runs(approved_by);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_bank_account_id ON payroll_runs(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_created_by ON payroll_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_paid_by ON payroll_runs(paid_by);

-- ============================================================================
-- payroll_slips
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payroll_slips_thai_company_id ON payroll_slips(thai_company_id);

-- ============================================================================
-- petty_cash_expenses
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_accounting_completed_by ON petty_cash_expenses(accounting_completed_by);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_created_by ON petty_cash_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_project_id ON petty_cash_expenses(project_id);

-- ============================================================================
-- petty_cash_reimbursement_batches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursement_batches_bank_account_id ON petty_cash_reimbursement_batches(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursement_batches_created_by ON petty_cash_reimbursement_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursement_batches_wallet_holder_id ON petty_cash_reimbursement_batches(wallet_holder_id);

-- ============================================================================
-- petty_cash_reimbursements
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursements_bank_account_id_fk ON petty_cash_reimbursements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursements_bank_feed_line_id ON petty_cash_reimbursements(bank_feed_line_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursements_expense_id_fk ON petty_cash_reimbursements(expense_id);

-- ============================================================================
-- petty_cash_topups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_topups_bank_account_id ON petty_cash_topups(bank_account_id);

-- ============================================================================
-- projects
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_intercompany_owner_company_id ON projects(intercompany_owner_company_id);

-- ============================================================================
-- public_calendar_links
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_public_calendar_links_created_by ON public_calendar_links(created_by);

-- ============================================================================
-- quotation_line_items
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quotation_line_items_project_id ON quotation_line_items(project_id);

-- ============================================================================
-- quotations
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_converted_to_invoice_id ON quotations(converted_to_invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);

-- ============================================================================
-- receipt_line_items
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_project_id ON receipt_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_revenue_recognition_id ON receipt_line_items(revenue_recognition_id);

-- ============================================================================
-- receipts
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);

-- ============================================================================
-- recurring_journal_templates
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recurring_journal_templates_created_by ON recurring_journal_templates(created_by);

-- ============================================================================
-- revenue_recognition
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_created_by ON revenue_recognition(created_by);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_deferred_journal_entry_id ON revenue_recognition(deferred_journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_invoice_id ON revenue_recognition(invoice_id);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_recognition_journal_entry_id ON revenue_recognition(recognition_journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_recognized_by ON revenue_recognition(recognized_by);

-- ============================================================================
-- role_permissions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_code ON role_permissions(permission_code);

-- ============================================================================
-- user_profiles
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);

-- ============================================================================
-- vat_filings
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vat_filings_filed_by ON vat_filings(filed_by);

-- ============================================================================
-- wht_certificates
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wht_certificates_created_by ON wht_certificates(created_by);

-- ============================================================================
-- wht_from_customer
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_receipt_line_item_id ON wht_from_customer(receipt_line_item_id);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_received_by ON wht_from_customer(received_by);

-- ============================================================================
-- yacht_products
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_yacht_products_created_by ON yacht_products(created_by);
