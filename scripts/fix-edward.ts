import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // Find Edward by employee_id
  const { data: emps } = await supabase
    .from('employees')
    .select('id, user_id, first_name, last_name, employee_id')
    .eq('employee_id', 'FAteam-0023');
  console.log('Employee record:', emps);

  // Also check all user_profiles for any new Edward
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, full_name');
  console.log('\nAll users:', users?.map(u => `${u.full_name} (${u.id})`));

  // If we found Edward's user_id, update bookings
  if (emps && emps.length > 0 && emps[0].user_id) {
    const edwardUserId = emps[0].user_id;
    console.log(`\nEdward's user_id: ${edwardUserId}`);

    const { data: edwardBookings } = await supabase
      .from('bookings')
      .select('id')
      .like('internal_notes', '%Booking owner: Edward%')
      .like('internal_notes', '%[NOTION_IMPORT]%');

    if (edwardBookings && edwardBookings.length > 0) {
      const ids = edwardBookings.map(b => b.id);
      const { error } = await supabase
        .from('bookings')
        .update({ booking_owner: edwardUserId })
        .in('id', ids);
      console.log(`Fixed ${ids.length} bookings to Edward`);
      if (error) console.error('Error:', error.message);
    } else {
      console.log('No bookings with "Booking owner: Edward" found');
    }
  } else {
    console.log('\nEdward has no linked user_id in employees table.');
    console.log('Checking if Edward exists in user_profiles directly...');
    const edward = users?.find(u => u.full_name?.toLowerCase().includes('edward'));
    if (edward) {
      console.log(`Found: ${edward.full_name} (${edward.id})`);
      const { data: edwardBookings } = await supabase
        .from('bookings')
        .select('id')
        .like('internal_notes', '%Booking owner: Edward%')
        .like('internal_notes', '%[NOTION_IMPORT]%');

      if (edwardBookings && edwardBookings.length > 0) {
        const ids = edwardBookings.map(b => b.id);
        const { error } = await supabase
          .from('bookings')
          .update({ booking_owner: edward.id })
          .in('id', ids);
        console.log(`Fixed ${ids.length} bookings to ${edward.full_name}`);
        if (error) console.error('Error:', error.message);
      }
    } else {
      console.log('Edward not found in user_profiles either.');
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
