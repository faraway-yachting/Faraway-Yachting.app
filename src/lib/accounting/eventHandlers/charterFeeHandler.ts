/**
 * Charter Fee Handler
 *
 * Auto-generates intercompany charter fee records when a receipt is created/approved.
 * This is purely for tracking money distribution between entities - NO P&L impact.
 */

import { intercompanyCharterFeesApi } from '@/lib/supabase/api/intercompanyCharterFees';
import { projectsApi } from '@/lib/supabase/api/projects';

/** Map receipt charter types to project fee fields */
const CHARTER_TYPE_TO_FEE_FIELD = {
  day_charter: 'intercompany_fee_day_charter',
  overnight_charter: 'intercompany_fee_overnight',
  cabin_charter: 'intercompany_fee_cabin',
  other_charter: 'intercompany_fee_other',
  bareboat_charter: 'intercompany_fee_other',
  crewed_charter: 'intercompany_fee_other',
  outsource_commission: 'intercompany_fee_other',
} as const;

type FeeField = (typeof CHARTER_TYPE_TO_FEE_FIELD)[keyof typeof CHARTER_TYPE_TO_FEE_FIELD];

export interface CharterFeeHandlerInput {
  receiptId: string;
  receiptNumber: string;
  receiptCompanyId: string;
  charterType: string | null;
  charterDate: string;
  currency: string;
  /** Project IDs from the receipt's line items */
  projectIds: string[];
}

export interface CharterFeeHandlerResult {
  created: number;
  errors: string[];
}

/**
 * Generate intercompany charter fee records for a receipt.
 * Called after receipt creation when status is 'paid'.
 */
export async function generateCharterFees(
  input: CharterFeeHandlerInput
): Promise<CharterFeeHandlerResult> {
  const result: CharterFeeHandlerResult = { created: 0, errors: [] };

  if (!input.charterType || input.projectIds.length === 0) {
    return result;
  }

  // Determine fee field from charter type
  const feeField = CHARTER_TYPE_TO_FEE_FIELD[input.charterType as keyof typeof CHARTER_TYPE_TO_FEE_FIELD];
  if (!feeField) {
    return result;
  }

  // Get unique project IDs
  const uniqueProjectIds = [...new Set(input.projectIds)];

  // Pre-fetch existing fees for this receipt to avoid N+1 queries
  const existingFees = await intercompanyCharterFeesApi.getByReceiptId(input.receiptId);

  for (const projectId of uniqueProjectIds) {
    try {
      const project = await projectsApi.getById(projectId);
      if (!project) continue;

      // Check if receipt company differs from the boat's owning company
      if (project.company_id === input.receiptCompanyId) {
        continue; // Same company, no intercompany fee needed
      }

      // Get the fee amount from the project configuration
      const feeAmount = project[feeField as FeeField] as number | null;
      if (!feeAmount || feeAmount <= 0) {
        result.errors.push(
          `Project ${project.name}: No ${input.charterType} fee configured`
        );
        continue;
      }

      // Check for duplicate (same receipt + project)
      const alreadyExists = existingFees.some(
        (f) => f.project_id === projectId
      );
      if (alreadyExists) {
        continue; // Already created
      }

      // Create the intercompany charter fee record
      await intercompanyCharterFeesApi.create({
        receipt_id: input.receiptId,
        receipt_number: input.receiptNumber,
        agency_company_id: input.receiptCompanyId,
        owner_company_id: project.company_id,
        project_id: projectId,
        charter_type: input.charterType,
        charter_date: input.charterDate,
        charter_fee_amount: feeAmount,
        currency: input.currency,
        status: 'pending',
      });

      result.created++;
      console.log(
        `[CharterFeeHandler] Created intercompany fee: ${project.name} → ${feeAmount} ${input.currency}`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Project ${projectId}: ${msg}`);
      console.error(`[CharterFeeHandler] Error for project ${projectId}:`, error);
    }
  }

  return result;
}
