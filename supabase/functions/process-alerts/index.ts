import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  documentExpiryTemplate,
  overdueInvoiceTemplate,
} from '../_shared/emailTemplates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split('T')[0];
    const results = { expiringDocs: 0, overdueInvoices: 0, errors: [] as string[] };

    // ================================================================
    // 1. Expiring Employee Documents
    // ================================================================
    // Find documents expiring within their alert_days_before window
    // that haven't already been notified (no notification with same reference_id)
    const { data: expiringDocs, error: docsError } = await supabase
      .from('employee_documents')
      .select('id, document_type, expiry_date, alert_days_before, employee_id')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today);

    if (docsError) {
      results.errors.push(`Documents query error: ${docsError.message}`);
    }

    for (const doc of expiringDocs ?? []) {
      const expiryDate = new Date(doc.expiry_date);
      const todayDate = new Date(today);
      const daysRemaining = Math.ceil((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      const alertThreshold = doc.alert_days_before || 30;

      // Only alert if within the threshold window
      if (daysRemaining > alertThreshold) continue;

      // Check if we already sent a notification for this document
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('reference_id', doc.id)
        .eq('type', 'document_expiry')
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name_en, email')
        .eq('id', doc.employee_id)
        .single();

      if (!employee) continue;

      const employeeName = employee.full_name_en || 'Unknown Employee';
      const formattedDate = new Date(doc.expiry_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });

      // Create notification for HR manager
      await supabase.from('notifications').insert({
        type: 'document_expiry',
        title: `Document expiring: ${doc.document_type}`,
        message: `${employeeName}'s ${doc.document_type} expires ${formattedDate} (${daysRemaining} days)`,
        reference_id: doc.id,
        target_role: 'manager',
        link: '/hr/manager/employees',
      });

      // Send email if RESEND_API_KEY is configured
      if (Deno.env.get('RESEND_API_KEY')) {
        const notifyEmail = Deno.env.get('HR_MANAGER_EMAIL');
        if (notifyEmail) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: notifyEmail,
                subject: `Document Expiring: ${employeeName} — ${doc.document_type}`,
                html: documentExpiryTemplate(employeeName, doc.document_type, formattedDate, daysRemaining),
              },
            });
          } catch (emailErr) {
            results.errors.push(`Email error for doc ${doc.id}: ${emailErr.message}`);
          }
        }
      }

      results.expiringDocs++;
    }

    // ================================================================
    // 2. Overdue Invoices
    // ================================================================
    // Find invoices where status = 'issued' and due_date < today
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_name, total_amount, currency, due_date')
      .eq('status', 'issued')
      .lt('due_date', today);

    if (invoicesError) {
      results.errors.push(`Invoices query error: ${invoicesError.message}`);
    }

    for (const invoice of overdueInvoices ?? []) {
      const dueDate = new Date(invoice.due_date);
      const todayDate = new Date(today);
      const daysPastDue = Math.ceil((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we already notified for this invoice (within last 7 days to allow re-alerts weekly)
      const weekAgo = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('reference_id', invoice.id)
        .eq('type', 'overdue_invoice')
        .gte('created_at', weekAgo)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      const formattedAmount = `${invoice.currency || 'THB'} ${Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      // Create notification for accountant
      await supabase.from('notifications').insert({
        type: 'overdue_invoice',
        title: `Invoice overdue: ${invoice.invoice_number}`,
        message: `${invoice.client_name || 'Unknown'} — ${formattedAmount} (${daysPastDue} days overdue)`,
        reference_id: invoice.id,
        reference_number: invoice.invoice_number,
        target_role: 'accountant',
        link: '/accounting/manager/income/overview',
      });

      // Send email if configured
      if (Deno.env.get('RESEND_API_KEY')) {
        const notifyEmail = Deno.env.get('ACCOUNTANT_EMAIL');
        if (notifyEmail) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: notifyEmail,
                subject: `Invoice Overdue: ${invoice.invoice_number} — ${invoice.client_name || 'Unknown'}`,
                html: overdueInvoiceTemplate(
                  invoice.invoice_number,
                  invoice.client_name || 'Unknown',
                  formattedAmount,
                  daysPastDue,
                ),
              },
            });
          } catch (emailErr) {
            results.errors.push(`Email error for invoice ${invoice.id}: ${emailErr.message}`);
          }
        }
      }

      results.overdueInvoices++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          expiringDocuments: results.expiringDocs,
          overdueInvoices: results.overdueInvoices,
        },
        errors: results.errors.length > 0 ? results.errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-alerts error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
