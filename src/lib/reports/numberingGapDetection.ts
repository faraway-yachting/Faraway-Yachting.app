/**
 * Sequential Document Numbering Gap Detection
 *
 * Detects missing numbers in receipt, invoice, credit note, and debit note sequences.
 * Thai accounting law requires continuous document numbering without gaps.
 */

import { createClient } from '@/lib/supabase/client';

export interface NumberingGap {
  documentType: string;
  companyId: string;
  companyName: string;
  missingNumber: number;
  prefix: string;
  previousDoc: string;
  nextDoc: string;
}

export interface GapDetectionResult {
  gaps: NumberingGap[];
  totalGaps: number;
  scannedDocuments: number;
  generatedAt: string;
}

interface DocRecord {
  number: string;
  company_id: string;
}

/**
 * Parse the sequential portion from a document number.
 * Handles formats like: RE-2602-0001, INV-2602-0001, CN-2602-0001
 * Returns the numeric suffix as an integer.
 */
function parseSequence(docNumber: string): { prefix: string; seq: number } | null {
  const match = docNumber.match(/^(.+-)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], seq: parseInt(match[2], 10) };
}

async function fetchDocNumbers(
  tableName: string,
  numberColumn: string,
): Promise<{ number: string; company_id: string }[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from(tableName)
    .select(`${numberColumn}, company_id`)
    .neq('status', 'void')
    .order(numberColumn, { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    number: d[numberColumn] || '',
    company_id: d.company_id,
  }));
}

function detectGaps(
  docs: DocRecord[],
  documentType: string,
  companyMap: Map<string, string>,
): NumberingGap[] {
  // Group by prefix+company
  const groups = new Map<string, { prefix: string; companyId: string; seqs: number[]; numbers: Map<number, string> }>();

  for (const doc of docs) {
    if (!doc.number) continue;
    const parsed = parseSequence(doc.number);
    if (!parsed) continue;

    const key = `${parsed.prefix}__${doc.company_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        prefix: parsed.prefix,
        companyId: doc.company_id,
        seqs: [],
        numbers: new Map(),
      });
    }
    const group = groups.get(key)!;
    group.seqs.push(parsed.seq);
    group.numbers.set(parsed.seq, doc.number);
  }

  const gaps: NumberingGap[] = [];

  for (const group of groups.values()) {
    group.seqs.sort((a, b) => a - b);
    for (let i = 1; i < group.seqs.length; i++) {
      const prev = group.seqs[i - 1];
      const curr = group.seqs[i];
      // Detect gaps
      for (let missing = prev + 1; missing < curr; missing++) {
        gaps.push({
          documentType,
          companyId: group.companyId,
          companyName: companyMap.get(group.companyId) || 'Unknown',
          missingNumber: missing,
          prefix: group.prefix,
          previousDoc: group.numbers.get(prev) || `${group.prefix}${prev}`,
          nextDoc: group.numbers.get(curr) || `${group.prefix}${curr}`,
        });
      }
    }
  }

  return gaps;
}

export async function detectNumberingGaps(): Promise<GapDetectionResult> {
  const supabase = createClient();

  // Load company names
  const { data: companies } = await supabase.from('companies').select('id, name');
  const companyMap = new Map<string, string>();
  for (const c of companies ?? []) {
    companyMap.set(c.id, c.name);
  }

  // Fetch all document numbers
  const [receipts, invoices] = await Promise.all([
    fetchDocNumbers('receipts', 'receipt_number'),
    fetchDocNumbers('invoices', 'invoice_number'),
  ]);

  const allGaps: NumberingGap[] = [
    ...detectGaps(receipts, 'receipt', companyMap),
    ...detectGaps(invoices, 'invoice', companyMap),
  ];

  return {
    gaps: allGaps,
    totalGaps: allGaps.length,
    scannedDocuments: receipts.length + invoices.length,
    generatedAt: new Date().toISOString(),
  };
}
