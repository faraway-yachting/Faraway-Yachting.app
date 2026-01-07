/**
 * Project Types
 *
 * Projects represent yachts/boats/charters that belong to a Company.
 * Each project has Participants with ownership and profit share percentages.
 *
 * Note: Projects belong to a Company for legal registration purposes (boats must be
 * registered under a company by law). However, transactions for P&L calculation can
 * come from any company in the Faraway Yachting group.
 */

import { Currency } from '@/data/company/types';

export type ProjectStatus = 'active' | 'inactive' | 'completed';
export type ProjectType = 'yacht' | 'charter' | 'event' | 'other';

/**
 * Participant in a project with ownership percentage
 * Total ownership percentage across all participants must equal 100%
 * Profit share is the same as ownership percentage
 */
export interface ProjectParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  ownershipPercentage: number; // 0-100, must total 100% across all participants
  role: 'owner' | 'investor' | 'partner' | 'manager';
  notes?: string;
  capitalInvested?: number; // Amount invested by this participant
  capitalCurrency?: Currency; // Currency for the capital invested
}

/**
 * Project entity
 * Belongs to a Company and has multiple Participants
 */
export interface Project {
  id: string;
  name: string;
  code: string; // Short code for reference (e.g., "OCEAN-STAR", "WAVE-RIDER")
  companyId: string; // The company this project belongs to
  type: ProjectType;
  description?: string;

  // Participants with ownership and profit sharing
  participants: ProjectParticipant[];

  // Project details
  startDate?: string; // ISO date
  endDate?: string; // ISO date (for completed/time-bound projects)

  // Status
  status: ProjectStatus;

  // Management fee for Faraway Yachting (optional)
  managementFeePercentage?: number; // 0-100, used in P&L calculations

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  notes?: string;
}

/**
 * Validation helpers
 */
export interface ParticipantValidation {
  isValid: boolean;
  ownershipTotal: number;
  errors: string[];
}
