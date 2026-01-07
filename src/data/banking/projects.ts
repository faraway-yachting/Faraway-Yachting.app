/**
 * Project Data Model
 *
 * Projects represent specific yachts or vessels that are managed
 * under a parent company. Projects share the company's bank accounts
 * but have their own financial records (invoices, expenses, receipts).
 */

export interface Project {
  id: string;
  name: string;
  companyId: string; // Which company owns this project
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'archived';
}

export const mockProjects: Project[] = [
  {
    id: 'project-001',
    name: 'Amadeus',
    companyId: 'company-001', // Faraway Yachting
    description: 'Luxury yacht management project',
    status: 'active',
  },
  {
    id: 'project-002',
    name: 'Hot Chilli',
    companyId: 'company-001', // Faraway Yachting
    description: 'Performance yacht management project',
    status: 'active',
  },
];

export function getAllProjects(): Project[] {
  return mockProjects;
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find(p => p.id === id);
}

export function getProjectsByCompany(companyId: string): Project[] {
  return mockProjects.filter(p => p.companyId === companyId);
}
