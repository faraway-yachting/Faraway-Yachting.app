/**
 * Project Data and Operations
 *
 * Mock data and CRUD operations for Projects.
 * In production, this will be replaced with database queries.
 */

import { Project, ProjectParticipant, ProjectStatus, ParticipantValidation } from './types';

// Generate unique ID
const generateId = (): string => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateParticipantId = (): string => `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock data
export let projects: Project[] = [
  {
    id: 'project-001',
    name: 'Ocean Star',
    code: 'OCEAN-STAR',
    companyId: 'company-001', // Faraway Yachting - boat registered under this company
    type: 'yacht',
    description: 'Luxury 50ft sailing yacht for charter operations',
    participants: [
      {
        id: 'participant-001',
        name: 'John Smith',
        email: 'john@farawayyachting.com',
        ownershipPercentage: 60,
        role: 'owner',
        notes: 'Primary owner and operator',
        capitalInvested: 300000,
        capitalCurrency: 'THB',
      },
      {
        id: 'participant-002',
        name: 'Sarah Johnson',
        email: 'sarah@investor.com',
        ownershipPercentage: 40,
        role: 'investor',
        notes: 'Silent investor',
        capitalInvested: 200000,
        capitalCurrency: 'THB',
      },
    ],
    startDate: '2023-01-15',
    status: 'active',
    managementFeePercentage: 2, // 2% management fee for external investor
    createdAt: new Date('2023-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Flagship charter yacht',
  },
  {
    id: 'project-002',
    name: 'Wave Rider',
    code: 'WAVE-RIDER',
    companyId: 'company-001', // Faraway Yachting - boat registered under this company
    type: 'yacht',
    description: '45ft motor yacht for day charters',
    participants: [
      {
        id: 'participant-003',
        name: 'Michael Chen',
        email: 'michael@farawayyachting.com',
        ownershipPercentage: 100,
        role: 'owner',
        capitalInvested: 150000,
        capitalCurrency: 'THB',
      },
    ],
    startDate: '2023-06-01',
    status: 'active',
    createdAt: new Date('2023-06-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'project-003',
    name: 'Sea Breeze',
    code: 'SEA-BREEZE',
    companyId: 'company-002', // Blue Horizon Yachts - boat registered under this company
    type: 'yacht',
    description: 'Corporate event yacht',
    participants: [
      {
        id: 'participant-004',
        name: 'James Wilson',
        email: 'james@bluehorizon.com',
        ownershipPercentage: 50,
        role: 'partner',
        capitalInvested: 125000,
        capitalCurrency: 'EUR',
      },
      {
        id: 'participant-005',
        name: 'Emma Davis',
        email: 'emma@bluehorizon.com',
        ownershipPercentage: 30,
        role: 'partner',
        capitalInvested: 75000,
        capitalCurrency: 'EUR',
      },
      {
        id: 'participant-006',
        name: 'Robert Brown',
        email: 'robert@investor.com',
        ownershipPercentage: 20,
        role: 'investor',
        capitalInvested: 50000,
        capitalCurrency: 'EUR',
      },
    ],
    startDate: '2024-01-01',
    status: 'active',
    managementFeePercentage: 2.5, // 2.5% management fee for multiple partners
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============= CRUD Operations =============

/**
 * Get all projects
 */
export function getAllProjects(): Project[] {
  return projects;
}

/**
 * Get project by ID
 */
export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/**
 * Get projects by company
 */
export function getProjectsByCompany(companyId: string): Project[] {
  return projects.filter((p) => p.companyId === companyId);
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): Project[] {
  return projects.filter((p) => p.status === status);
}

/**
 * Get active projects by company
 */
export function getActiveProjectsByCompany(companyId: string): Project[] {
  return projects.filter((p) => p.companyId === companyId && p.status === 'active');
}

/**
 * Create a new project
 */
export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const now = new Date().toISOString();
  const newProject: Project = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  projects.push(newProject);
  return newProject;
}

/**
 * Update a project
 */
export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  return projects[index];
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;

  projects.splice(index, 1);
  return true;
}

/**
 * Toggle project status (active/inactive)
 */
export function toggleProjectStatus(id: string): Project | null {
  const project = getProjectById(id);
  if (!project) return null;

  const newStatus: ProjectStatus = project.status === 'active' ? 'inactive' : 'active';
  return updateProject(id, { status: newStatus });
}

// ============= Participant Operations =============

/**
 * Add participant to project
 */
export function addParticipant(
  projectId: string,
  participant: Omit<ProjectParticipant, 'id'>
): Project | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const newParticipant: ProjectParticipant = {
    ...participant,
    id: generateParticipantId(),
  };

  return updateProject(projectId, {
    participants: [...project.participants, newParticipant],
  });
}

/**
 * Update participant in project
 */
export function updateParticipant(
  projectId: string,
  participantId: string,
  updates: Partial<ProjectParticipant>
): Project | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const updatedParticipants = project.participants.map((p) =>
    p.id === participantId ? { ...p, ...updates, id: participantId } : p
  );

  return updateProject(projectId, { participants: updatedParticipants });
}

/**
 * Remove participant from project
 */
export function removeParticipant(projectId: string, participantId: string): Project | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const updatedParticipants = project.participants.filter((p) => p.id !== participantId);
  return updateProject(projectId, { participants: updatedParticipants });
}

// ============= Validation =============

/**
 * Validate participant percentages
 * Ownership must total exactly 100%
 */
export function validateParticipants(participants: ProjectParticipant[]): ParticipantValidation {
  const errors: string[] = [];

  const ownershipTotal = participants.reduce((sum, p) => sum + p.ownershipPercentage, 0);

  if (participants.length === 0) {
    errors.push('At least one participant is required');
  }

  if (Math.abs(ownershipTotal - 100) > 0.01) {
    errors.push(`Ownership percentages must total 100% (currently ${ownershipTotal.toFixed(2)}%)`);
  }

  // Check for negative values
  participants.forEach((p, index) => {
    if (p.ownershipPercentage < 0) {
      errors.push(`Participant ${index + 1}: Ownership percentage cannot be negative`);
    }
    if (p.ownershipPercentage > 100) {
      errors.push(`Participant ${index + 1}: Ownership percentage cannot exceed 100%`);
    }
  });

  return {
    isValid: errors.length === 0,
    ownershipTotal,
    errors,
  };
}

