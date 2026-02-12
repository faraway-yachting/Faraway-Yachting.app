/**
 * Fix imported bookings: boat name mismatches and booking owners
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // 1. Check project names and users
  const { data: projects } = await supabase.from('projects').select('id, name');
  console.log('Projects:', projects?.map(p => `${p.name} (${p.id})`));

  const { data: users } = await supabase.from('user_profiles').select('id, full_name');
  console.log('\nUsers:', users?.map(u => `${u.full_name} (${u.id})`));

  // 2. Fix "Hot Chili" → "Hot Chilli" (project)
  const hotChilliProject = projects?.find(p => p.name === 'Hot Chilli');
  if (hotChilliProject) {
    const { data: fixed, error } = await supabase
      .from('bookings')
      .update({ project_id: hotChilliProject.id, external_boat_name: null })
      .eq('external_boat_name', 'Hot Chili')
      .like('internal_notes', '%[NOTION_IMPORT]%')
      .select('id');
    console.log(`\nFixed "Hot Chili" → Hot Chilli project: ${fixed?.length || 0} bookings`);
    if (error) console.error('  Error:', error.message);
  } else {
    console.log('\nWARNING: "Hot Chilli" project not found');
  }

  // 3. Fix "Nauti By Nature" → "Nauti by Nature" (check exact name)
  const nautiProject = projects?.find(p => p.name.toLowerCase() === 'nauti by nature');
  if (nautiProject) {
    const { data: fixed, error } = await supabase
      .from('bookings')
      .update({ project_id: nautiProject.id, external_boat_name: null })
      .eq('external_boat_name', 'Nauti By Nature')
      .like('internal_notes', '%[NOTION_IMPORT]%')
      .select('id');
    console.log(`Fixed "Nauti By Nature" → ${nautiProject.name} project: ${fixed?.length || 0} bookings`);
    if (error) console.error('  Error:', error.message);
  } else {
    console.log('\nWARNING: "Nauti by Nature" project not found');
  }

  // 4. Fix booking owner "Edward"
  const edward = users?.find(u => u.full_name?.toLowerCase().includes('edward'));
  if (edward) {
    // Find bookings where internal_notes contains "Booking owner: Edward"
    const { data: edwardBookings, error: findErr } = await supabase
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
      console.log(`Fixed booking owner "Edward" → ${edward.full_name} (${edward.id}): ${ids.length} bookings`);
      if (error) console.error('  Error:', error.message);
    } else {
      console.log('No bookings with "Booking owner: Edward" found');
    }
  } else {
    console.log('\nWARNING: No user with "Edward" in name found');
  }

  // 5. Fix booking owner "Oil"
  const oil = users?.find(u => u.full_name?.toLowerCase().includes('oil'));
  if (oil) {
    const { data: oilBookings } = await supabase
      .from('bookings')
      .select('id')
      .like('internal_notes', '%Booking owner: Oil%')
      .like('internal_notes', '%[NOTION_IMPORT]%');

    if (oilBookings && oilBookings.length > 0) {
      const ids = oilBookings.map(b => b.id);
      const { error } = await supabase
        .from('bookings')
        .update({ booking_owner: oil.id })
        .in('id', ids);
      console.log(`Fixed booking owner "Oil" → ${oil.full_name} (${oil.id}): ${ids.length} bookings`);
      if (error) console.error('  Error:', error.message);
    }
  } else {
    console.log('No user with "Oil" in name found — skipping');
  }

  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
