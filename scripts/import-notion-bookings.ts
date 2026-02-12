/**
 * Notion Booking Import Script
 *
 * Imports bookings from a Notion CSV export into the Supabase database.
 * Maps core fields (boat, dates, type, status, title) to booking columns.
 * All other CSV columns are dumped into internal_notes for manual reference.
 *
 * Usage:
 *   npx tsx scripts/import-notion-bookings.ts [options] [csv-file]
 *
 * Options:
 *   --dry-run   Parse & validate only, no DB writes
 *   --cleanup   Delete all previously imported [NOTION_IMPORT] bookings
 *
 * CSV file defaults to: notion-bookings-export.csv (in project root)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. Environment & Supabase admin client
// ---------------------------------------------------------------------------

config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------------
// 2. CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEANUP = args.includes('--cleanup');
const csvArg = args.find(a => !a.startsWith('--'));
const CSV_PATH = resolve(process.cwd(), csvArg || 'notion-bookings-export.csv');

const IMPORT_TAG = '[NOTION_IMPORT]';

// Structured fields that map to booking columns — everything else goes to internal_notes
const STRUCTURED_FIELDS = ['Boat', 'Start date', 'End date', 'Charter type', 'Title', 'Booking Status'];

// ---------------------------------------------------------------------------
// 3. Data transformation helpers
// ---------------------------------------------------------------------------

/** DD/MM/YYYY → YYYY-MM-DD */
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const day = d.padStart(2, '0');
  const month = m.padStart(2, '0');
  return `${y}-${month}-${day}`;
}

/** Map free-text charter type to DB enum */
function mapCharterType(raw: string): string {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('cabin')) return 'cabin_charter';
  if (lower.includes('overnight')) return 'overnight_charter';
  return 'day_charter'; // default
}

/** Map free-text booking status to DB enum */
function mapBookingStatus(raw: string): string {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('cancel')) return 'cancelled';
  if (lower.includes('complet')) return 'completed';
  if (lower.includes('hold')) return 'hold';
  if (lower.includes('enquir')) return 'enquiry';
  if (lower.includes('book')) return 'booked';
  return 'enquiry'; // default
}

/** Build internal_notes from all non-structured columns */
function buildInternalNotes(row: Record<string, string>): string {
  const lines: string[] = [IMPORT_TAG];
  for (const [key, value] of Object.entries(row)) {
    if (STRUCTURED_FIELDS.includes(key)) continue;
    if (!value || !value.trim()) continue;
    lines.push(`${key}: ${value.trim()}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 4. Lookup tables
// ---------------------------------------------------------------------------

interface ProjectLookup { id: string; name: string; }
interface ExternalBoatLookup { name: string; }
async function loadProjects(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('projects').select('id, name');
  if (error) throw error;
  const map = new Map<string, string>();
  for (const p of (data || []) as { id: string; name: string }[]) {
    map.set(p.name.toLowerCase(), p.id);
  }
  return map;
}

async function loadExternalBoats(): Promise<Set<string>> {
  const { data, error } = await supabase.from('external_boats').select('name');
  if (error) throw error;
  const set = new Set<string>();
  for (const b of (data || []) as { name: string }[]) {
    set.add(b.name.toLowerCase());
  }
  return set;
}

async function loadUsers(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('user_profiles').select('id, full_name');
  if (error) throw error;
  const map = new Map<string, string>();
  for (const u of (data || []) as { id: string; full_name: string | null }[]) {
    if (u.full_name) {
      map.set(u.full_name.toLowerCase(), u.id);
    }
  }
  return map;
}

/** Resolve boat name → { project_id, external_boat_name } */
function resolveBoat(
  boatName: string,
  projects: Map<string, string>,
  externalBoats: Set<string>
): { project_id: string | null; external_boat_name: string | null; warning?: string } {
  if (!boatName || !boatName.trim()) {
    return { project_id: null, external_boat_name: null, warning: 'Empty boat name' };
  }
  const lower = boatName.trim().toLowerCase();

  // 1. Check projects
  const projectId = projects.get(lower);
  if (projectId) return { project_id: projectId, external_boat_name: null };

  // 2. Check external boats
  if (externalBoats.has(lower)) {
    // Find exact-case name from original set
    return { project_id: null, external_boat_name: boatName.trim() };
  }

  // 3. Fallback — use as external boat name with warning
  return {
    project_id: null,
    external_boat_name: boatName.trim(),
    warning: `"${boatName}" not found in Projects or Boat Register (imported as external boat)`,
  };
}

// ---------------------------------------------------------------------------
// 5. Booking number generation
// ---------------------------------------------------------------------------

/** Get the next available booking number, tracking state across calls */
async function createBookingNumberGenerator() {
  // Load all existing booking numbers to find max per month prefix
  const { data, error } = await supabase
    .from('bookings')
    .select('booking_number')
    .like('booking_number', 'FA-%');
  if (error) throw error;

  const prefixMax = new Map<string, number>();
  for (const row of (data || [])) {
    const bn = row.booking_number;
    const prefix = bn.substring(0, 9); // "FA-YYYYMM"
    const seq = parseInt(bn.substring(9), 10);
    if (!isNaN(seq)) {
      prefixMax.set(prefix, Math.max(prefixMax.get(prefix) || 0, seq));
    }
  }

  return function getNext(date: string): string {
    // date is YYYY-MM-DD
    const [y, m] = date.split('-');
    const prefix = `FA-${y}${m}`;
    const current = prefixMax.get(prefix) || 0;
    const next = current + 1;
    prefixMax.set(prefix, next);
    return `${prefix}${String(next).padStart(3, '0')}`;
  };
}

// ---------------------------------------------------------------------------
// 6. Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log('Cleaning up previously imported bookings...');

  // Find all bookings tagged with [NOTION_IMPORT]
  const { data: bookings, error: findError } = await supabase
    .from('bookings')
    .select('id, booking_number, title')
    .like('internal_notes', `%${IMPORT_TAG}%`);

  if (findError) {
    console.error('Error finding imported bookings:', findError.message);
    process.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log('No imported bookings found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${bookings.length} imported bookings to delete.`);

  const bookingIds = bookings.map(b => b.id);

  // Delete cabin allocations first (cascade should handle this, but be explicit)
  const { error: cabinError } = await supabase
    .from('cabin_allocations')
    .delete()
    .in('booking_id', bookingIds);
  if (cabinError) console.warn('Warning deleting cabin allocations:', cabinError.message);

  // Delete bookings (booking_payments cascade on delete)
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .in('id', bookingIds);

  if (deleteError) {
    console.error('Error deleting bookings:', deleteError.message);
    process.exit(1);
  }

  console.log(`Deleted ${bookings.length} bookings:`);
  for (const b of bookings) {
    console.log(`  - ${b.booking_number}: ${b.title}`);
  }
}

// ---------------------------------------------------------------------------
// 7. Main import
// ---------------------------------------------------------------------------

async function main() {
  if (CLEANUP) {
    await cleanup();
    if (!csvArg && !args.some(a => !a.startsWith('--') && a !== '--cleanup')) {
      // Cleanup only, no CSV to import
      return;
    }
  }

  // Read CSV
  console.log(`\nReading CSV: ${CSV_PATH}`);
  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, 'utf-8');
  } catch (e: any) {
    console.error(`Cannot read CSV file: ${e.message}`);
    process.exit(1);
  }

  const rows: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`Parsed ${rows.length} rows from CSV`);

  if (DRY_RUN) console.log('\n=== DRY RUN MODE — no data will be written ===\n');

  // Load lookup tables
  console.log('Loading lookup tables...');
  const [projects, externalBoats, users] = await Promise.all([
    loadProjects(),
    loadExternalBoats(),
    loadUsers(),
  ]);
  console.log(`  Projects: ${projects.size}, External boats: ${externalBoats.size}, Users: ${users.size}`);

  // Load booking number generator
  const getNextBookingNumber = await createBookingNumberGenerator();

  // Resolve a default booking_owner (first user found, or first admin)
  let defaultOwnerId: string | null = null;
  if (users.size > 0) {
    defaultOwnerId = users.values().next().value!;
  }
  if (!defaultOwnerId) {
    console.error('No users found in user_profiles. Cannot set booking_owner.');
    process.exit(1);
  }

  // Group cabin charter rows
  type CsvRow = Record<string, string>;
  interface BookingGroup {
    rows: CsvRow[];
    isCabin: boolean;
  }

  const bookingGroups: BookingGroup[] = [];
  const cabinGroupKeys = new Map<string, number>(); // key → index in bookingGroups

  for (const row of rows) {
    const charterType = mapCharterType(row['Charter type'] || '');

    if (charterType === 'cabin_charter') {
      const dateFrom = parseDate(row['Start date'] || '');
      const dateTo = parseDate(row['End date'] || '');
      const boat = (row['Boat'] || '').trim().toLowerCase();
      const key = `${boat}|${dateFrom}|${dateTo}`;

      if (cabinGroupKeys.has(key)) {
        bookingGroups[cabinGroupKeys.get(key)!].rows.push(row);
      } else {
        cabinGroupKeys.set(key, bookingGroups.length);
        bookingGroups.push({ rows: [row], isCabin: true });
      }
    } else {
      bookingGroups.push({ rows: [row], isCabin: false });
    }
  }

  console.log(`\nGrouped into ${bookingGroups.length} bookings (${bookingGroups.filter(g => g.isCabin).length} cabin charter groups)`);

  // Process each group
  let inserted = 0;
  let skipped = 0;
  let cabinAllocsCreated = 0;
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let gi = 0; gi < bookingGroups.length; gi++) {
    const group = bookingGroups[gi];
    const firstRow = group.rows[0];
    const rowIndex = rows.indexOf(firstRow) + 2; // +2 for 1-indexed + header row

    // Parse core fields from first row
    const dateFrom = parseDate(firstRow['Start date'] || '');
    const dateTo = parseDate(firstRow['End date'] || '');
    const charterType = mapCharterType(firstRow['Charter type'] || '');
    const status = mapBookingStatus(firstRow['Booking Status'] || '');
    const title = (firstRow['Title'] || '').trim();
    const boatName = (firstRow['Boat'] || '').trim();

    // Validate required fields
    if (!dateFrom || !dateTo) {
      errors.push(`Row ${rowIndex}: Missing or invalid dates (Start: "${firstRow['Start date']}", End: "${firstRow['End date']}")`);
      skipped++;
      continue;
    }
    if (!title) {
      errors.push(`Row ${rowIndex}: Missing title`);
      skipped++;
      continue;
    }
    if (dateFrom > dateTo) {
      errors.push(`Row ${rowIndex}: Start date (${dateFrom}) is after end date (${dateTo})`);
      skipped++;
      continue;
    }

    // Resolve boat
    const boat = resolveBoat(boatName, projects, externalBoats);
    if (!boat.project_id && !boat.external_boat_name) {
      errors.push(`Row ${rowIndex}: No boat name provided`);
      skipped++;
      continue;
    }
    if (boat.warning) {
      warnings.push(`Row ${rowIndex}: ${boat.warning}`);
    }

    // Resolve booking_owner from "Booking owner" column
    const ownerName = (firstRow['Booking owner'] || '').trim().toLowerCase();
    let ownerId = defaultOwnerId;
    if (ownerName && users.has(ownerName)) {
      ownerId = users.get(ownerName)!;
    } else if (ownerName) {
      warnings.push(`Row ${rowIndex}: Booking owner "${firstRow['Booking owner']}" not found in users, using default`);
    }

    // Generate booking number based on the booking's start date
    const bookingNumber = getNextBookingNumber(dateFrom);

    // Build internal notes from all non-structured fields
    const internalNotes = buildInternalNotes(firstRow);

    // Build the booking insert row
    const bookingRow: Record<string, any> = {
      booking_number: bookingNumber,
      type: charterType,
      status: status,
      title: title,
      customer_name: title, // Title doubles as customer name
      date_from: dateFrom,
      date_to: dateTo,
      project_id: boat.project_id,
      external_boat_name: boat.external_boat_name,
      booking_owner: ownerId,
      currency: 'THB',
      internal_notes: internalNotes,
    };

    if (DRY_RUN) {
      const cabinInfo = group.isCabin ? ` (${group.rows.length} cabins)` : '';
      console.log(`  [DRY] ${bookingNumber} | ${charterType} | ${status} | ${boatName} | ${dateFrom} → ${dateTo} | ${title}${cabinInfo}`);
      inserted++;

      if (group.isCabin) {
        for (let ci = 0; ci < group.rows.length; ci++) {
          const cabinRow = group.rows[ci];
          const cabinTitle = (cabinRow['Title'] || '').trim();
          console.log(`         Cabin ${ci + 1}: ${cabinTitle}`);
        }
        cabinAllocsCreated += group.rows.length;
      }
      continue;
    }

    // Insert booking
    const { data: insertedBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingRow)
      .select('id, booking_number')
      .single();

    if (insertError) {
      errors.push(`Row ${rowIndex}: Insert failed — ${insertError.message}`);
      skipped++;
      continue;
    }

    console.log(`  Inserted ${insertedBooking.booking_number}: ${title} (${boatName})`);
    inserted++;

    // Create cabin allocations for cabin charter groups
    if (group.isCabin && insertedBooking) {
      for (let ci = 0; ci < group.rows.length; ci++) {
        const cabinRow = group.rows[ci];
        const cabinTitle = (cabinRow['Title'] || '').trim();
        const cabinStatus = mapBookingStatus(cabinRow['Booking Status'] || '');
        const cabinNotes = buildInternalNotes(cabinRow);

        // Map booking status to cabin allocation status
        let allocStatus = 'available';
        if (cabinStatus === 'booked' || cabinStatus === 'completed') allocStatus = 'booked';
        else if (cabinStatus === 'hold') allocStatus = 'held';

        const allocRow: Record<string, any> = {
          booking_id: insertedBooking.id,
          cabin_label: `Cabin ${ci + 1}`,
          cabin_number: ci + 1,
          status: allocStatus,
          guest_names: cabinTitle,
          number_of_guests: 0,
          currency: 'THB',
          payment_status: 'unpaid',
          internal_notes: cabinNotes,
          sort_order: ci,
        };

        const { error: allocError } = await supabase
          .from('cabin_allocations')
          .insert(allocRow);

        if (allocError) {
          errors.push(`Row ${rowIndex}, Cabin ${ci + 1}: Allocation insert failed — ${allocError.message}`);
        } else {
          cabinAllocsCreated++;
          console.log(`    + Cabin ${ci + 1}: ${cabinTitle}`);
        }
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`  CSV rows:            ${rows.length}`);
  console.log(`  Booking groups:      ${bookingGroups.length}`);
  console.log(`  Bookings inserted:   ${inserted}`);
  console.log(`  Cabin allocs created:${cabinAllocsCreated}`);
  console.log(`  Skipped (errors):    ${skipped}`);
  if (DRY_RUN) console.log(`  Mode:                DRY RUN (no data written)`);

  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.log(`\nERRORS (${errors.length}):`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
