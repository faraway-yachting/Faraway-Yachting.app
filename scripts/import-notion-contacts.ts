/**
 * Notion Contact Import Script
 *
 * Imports contacts from a CSV export into the Supabase contacts table.
 * Parses by column index (not name) to handle duplicate column headers.
 *
 * Usage:
 *   npx tsx scripts/import-notion-contacts.ts [options] [csv-file]
 *
 * Options:
 *   --dry-run   Parse & validate only, no DB writes
 *   --cleanup   Delete all previously imported [NOTION_IMPORT] contacts
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
const CSV_PATH = resolve(process.cwd(), csvArg || 'notion-contacts-export.csv');

const IMPORT_TAG = '[NOTION_IMPORT]';

// ---------------------------------------------------------------------------
// 3. Column indices (0-based) — handles duplicate column names
// ---------------------------------------------------------------------------

const COL = {
  CONTACT_TYPE: 0,
  NATIONALITY: 1,
  TAX_ID: 2,
  BRANCH: 3,
  PERSON_TYPE: 4,       // Person/Juristic Person
  ORG_TYPE: 5,          // Organization Type
  PREFIX: 6,
  NAME: 7,
  LAST_NAME: 8,
  CONTACT_PERSON_1: 9,
  // Billing address block
  ADDRESS_1: 10,
  SUBDISTRICT_1: 11,
  CITY_1: 12,
  PROVINCE_1: 13,
  COUNTRY_1: 14,
  POSTAL_1: 15,
  // Shipping address block
  CONTACT_PERSON_2: 16,
  ADDRESS_2: 17,
  SUBDISTRICT_2: 18,
  CITY_2: 19,
  PROVINCE_2: 20,
  COUNTRY_2: 21,
  POSTAL_2: 22,
  // Contact info (middle)
  TEL_1: 23,
  EMAIL_1: 24,
  WEBSITE: 25,
  FAX: 26,
  // Bank info
  BANK: 27,
  ACCOUNT_NAME: 28,
  ACCOUNT_NO: 29,
  BRANCH_CODE: 30,
  // Contact info (end) — the ones we use
  TEL_2: 31,
  EMAIL_2: 32,
};

// Header names for notes dump (matching indices)
const HEADER_NAMES = [
  'Contact Type', 'Nationality', 'Tax ID', 'Branch', 'Person/Juristic Person',
  'Organization Type', 'Prefix', 'Name', 'LastName', 'Contact Person',
  'Address', 'Sub district', 'City', 'Province', 'Country', 'Postal Code',
  'Contact Person (2)', 'Address (2)', 'Sub district (2)', 'City (2)',
  'Province (2)', 'Country (2)', 'Postal Code (2)',
  'Tel (1)', 'Email (1)', 'Website', 'Fax',
  'Bank', 'Account Name', 'Account No.', 'Branch Code',
  'Tel', 'Email',
];

// Indices that map to structured fields (excluded from notes dump)
const STRUCTURED_INDICES = new Set([
  COL.NAME, COL.TAX_ID, COL.CONTACT_PERSON_1,
  COL.ADDRESS_1, COL.SUBDISTRICT_1, COL.CITY_1, COL.PROVINCE_1, COL.COUNTRY_1, COL.POSTAL_1,
  COL.TEL_2, COL.EMAIL_2,
]);

// ---------------------------------------------------------------------------
// 4. Helpers
// ---------------------------------------------------------------------------

function val(row: string[], idx: number): string {
  return (row[idx] || '').trim();
}

function buildBillingAddress(row: string[]): Record<string, string> | null {
  const street = val(row, COL.ADDRESS_1);
  const subdistrict = val(row, COL.SUBDISTRICT_1);
  const city = val(row, COL.CITY_1);
  const province = val(row, COL.PROVINCE_1);
  const country = val(row, COL.COUNTRY_1);
  const postalCode = val(row, COL.POSTAL_1);

  if (!street && !city && !province && !postalCode) return null;

  const addr: Record<string, string> = {};
  if (street) addr.street = street;
  if (subdistrict && city) addr.city = `${subdistrict}, ${city}`;
  else if (subdistrict) addr.city = subdistrict;
  else if (city) addr.city = city;
  if (province) addr.state = province;
  if (country) addr.country = country;
  if (postalCode) addr.postalCode = postalCode;
  return addr;
}

function buildNotes(row: string[]): string {
  const lines: string[] = [IMPORT_TAG];
  for (let i = 0; i < row.length; i++) {
    if (STRUCTURED_INDICES.has(i)) continue;
    const v = (row[i] || '').trim();
    if (!v || v === 'None' || v === 'Not specified') continue;
    const label = HEADER_NAMES[i] || `Column ${i}`;
    lines.push(`${label}: ${v}`);
  }
  return lines.length > 1 ? lines.join('\n') : IMPORT_TAG;
}

// ---------------------------------------------------------------------------
// 5. Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log('Cleaning up previously imported contacts...');

  const { data: contacts, error: findError } = await supabase
    .from('contacts')
    .select('id, name')
    .like('notes', `%${IMPORT_TAG}%`);

  if (findError) {
    console.error('Error finding imported contacts:', findError.message);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log('No imported contacts found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${contacts.length} imported contacts to delete.`);

  const { error: deleteError } = await supabase
    .from('contacts')
    .delete()
    .in('id', contacts.map(c => c.id));

  if (deleteError) {
    console.error('Error deleting contacts:', deleteError.message);
    process.exit(1);
  }

  console.log(`Deleted ${contacts.length} contacts.`);
}

// ---------------------------------------------------------------------------
// 6. Main import
// ---------------------------------------------------------------------------

async function main() {
  if (CLEANUP) {
    await cleanup();
    if (!csvArg) return;
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

  // Parse WITHOUT column headers (use arrays) to handle duplicate column names
  const allRows: string[][] = parse(csvContent, {
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  // Skip header row
  const headerRow = allRows[0];
  const rows = allRows.slice(1);

  console.log(`Parsed ${rows.length} data rows (${headerRow.length} columns)`);
  if (DRY_RUN) console.log('\n=== DRY RUN MODE — no data will be written ===\n');

  // Load existing contacts for dedup
  console.log('Loading existing contacts for dedup...');
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('name, tax_id');

  const existingKeys = new Set<string>();
  for (const c of (existingContacts || [])) {
    const key = `${(c.name || '').toLowerCase()}|${c.tax_id || ''}`;
    existingKeys.add(key);
  }
  console.log(`  Existing contacts: ${existingKeys.size}`);

  // Process rows
  let inserted = 0;
  let skipped = 0;
  let duplicates = 0;
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rowNum = ri + 2; // +2 for 1-indexed + header

    // Extract structured fields
    const name = val(row, COL.NAME);
    const taxId = val(row, COL.TAX_ID);
    const contactPerson = val(row, COL.CONTACT_PERSON_1);
    const phone = val(row, COL.TEL_2) || val(row, COL.TEL_1);
    const email = val(row, COL.EMAIL_2) || val(row, COL.EMAIL_1);
    const billingAddress = buildBillingAddress(row);
    const notes = buildNotes(row);

    // Validate
    if (!name) {
      errors.push(`Row ${rowNum}: Missing name`);
      skipped++;
      continue;
    }

    // Dedup check
    const dedupKey = `${name.toLowerCase()}|${taxId}`;
    if (existingKeys.has(dedupKey)) {
      duplicates++;
      continue;
    }
    existingKeys.add(dedupKey); // prevent dupes within the CSV itself

    // Build insert row
    const contactRow: Record<string, any> = {
      name,
      type: ['customer'], // default, user will adjust later
      tax_id: taxId || null,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      billing_address: billingAddress,
      default_currency: 'THB',
      notes: notes,
      is_active: true,
    };

    if (DRY_RUN) {
      const parts = [name];
      if (taxId) parts.push(`Tax: ${taxId}`);
      if (phone) parts.push(`Tel: ${phone}`);
      if (email) parts.push(`Email: ${email}`);
      console.log(`  [DRY] Row ${rowNum}: ${parts.join(' | ')}`);
      inserted++;
      continue;
    }

    // Insert
    const { error: insertError } = await supabase
      .from('contacts')
      .insert(contactRow);

    if (insertError) {
      errors.push(`Row ${rowNum}: Insert failed — ${insertError.message}`);
      skipped++;
      continue;
    }

    console.log(`  Inserted: ${name}`);
    inserted++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`  CSV rows:          ${rows.length}`);
  console.log(`  Contacts inserted: ${inserted}`);
  console.log(`  Skipped (dupes):   ${duplicates}`);
  console.log(`  Skipped (errors):  ${skipped}`);
  if (DRY_RUN) console.log(`  Mode:              DRY RUN (no data written)`);

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
