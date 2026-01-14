import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhwikjovukvcrgiiyyuf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod2lram92dWt2Y3JnaWl5eXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc1MDQ2OCwiZXhwIjoyMDgzMzI2NDY4fQ.kmuPbDFtvtpPSqsvE5CdNq5ko-6Lo8GoO6KLiLcVh9E';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log('=== Checking accounting_events ===');
  const { data: events, error: eventsError } = await supabase
    .from('accounting_events')
    .select('id, event_type, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (eventsError) {
    console.log('Events error:', eventsError);
  } else {
    console.log('Events found:', events?.length || 0);
    if (events && events.length > 0) {
      events.forEach(e => console.log(JSON.stringify(e)));
    }
  }

  console.log('\n=== Checking journal_entries ===');
  const { data: journals, error: journalsError } = await supabase
    .from('journal_entries')
    .select('id, entry_date, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (journalsError) {
    console.log('Journals error:', journalsError);
  } else {
    console.log('Journals found:', journals?.length || 0);
    if (journals && journals.length > 0) {
      journals.forEach(j => console.log(JSON.stringify(j)));
    }
  }

  console.log('\n=== Checking expenses ===');
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, expense_number, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (expensesError) {
    console.log('Expenses error:', expensesError);
  } else {
    console.log('Expenses found:', expenses?.length || 0);
    if (expenses && expenses.length > 0) {
      expenses.forEach(e => console.log(JSON.stringify(e)));
    }
  }
}

check().then(() => process.exit(0));
