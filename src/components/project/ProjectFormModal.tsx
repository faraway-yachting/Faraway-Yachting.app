'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Users, Anchor, Loader2 } from 'lucide-react';
import type {
  Project,
  ProjectParticipant,
  ProjectType,
  ProjectStatus,
} from '@/data/project/types';
import { Currency, Company } from '@/data/company/types';
import { validateParticipants } from '@/data/project/projects';
import { companiesApi, projectsApi } from '@/lib/supabase/api';
import { dbCompanyToFrontend, frontendProjectToDb } from '@/lib/supabase/transforms';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingProject: Project | null;
  selectedCompanyId?: string;
}

const projectTypes: { value: ProjectType; label: string }[] = [
  { value: 'yacht', label: 'Yacht' },
  { value: 'charter', label: 'Charter' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const participantRoles: { value: ProjectParticipant['role']; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'investor', label: 'Investor' },
  { value: 'partner', label: 'Partner' },
  { value: 'manager', label: 'Manager' },
];

const currencies: Currency[] = ['THB', 'EUR', 'USD', 'SGD', 'GBP', 'AED'];

const generateParticipantId = (): string =>
  `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function ProjectFormModal({
  isOpen,
  onClose,
  onSave,
  editingProject,
  selectedCompanyId,
}: ProjectFormModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingProject;

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const data = await companiesApi.getActive();
        setCompanies(data.map(dbCompanyToFrontend));
      } catch (e) {
        console.error('Failed to fetch companies:', e);
      } finally {
        setLoadingCompanies(false);
      }
    };
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [companyId, setCompanyId] = useState(selectedCompanyId || companies[0]?.id || '');
  const [type, setType] = useState<ProjectType>('yacht');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [notes, setNotes] = useState('');
  const [managementFeePercentage, setManagementFeePercentage] = useState<number | undefined>(undefined);

  // Participants
  const [participants, setParticipants] = useState<ProjectParticipant[]>([
    {
      id: generateParticipantId(),
      name: '',
      email: '',
      ownershipPercentage: 100,
      role: 'owner',
    },
  ]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing project changes
  useEffect(() => {
    if (isOpen) {
      if (editingProject) {
        setName(editingProject.name);
        setCode(editingProject.code);
        setCompanyId(editingProject.companyId);
        setType(editingProject.type);
        setDescription(editingProject.description || '');
        setStartDate(editingProject.startDate || '');
        setEndDate(editingProject.endDate || '');
        setStatus(editingProject.status);
        setNotes(editingProject.notes || '');
        setManagementFeePercentage(editingProject.managementFeePercentage);
        setParticipants(
          editingProject.participants.length > 0
            ? editingProject.participants
            : [
                {
                  id: generateParticipantId(),
                  name: '',
                  email: '',
                  ownershipPercentage: 100,
                  role: 'owner',
                },
              ]
        );
      } else {
        // Reset for new project
        setName('');
        setCode('');
        setCompanyId(selectedCompanyId || companies[0]?.id || '');
        setType('yacht');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setStatus('active');
        setNotes('');
        setManagementFeePercentage(undefined);
        setParticipants([
          {
            id: generateParticipantId(),
            name: '',
            email: '',
            ownershipPercentage: 100,
            role: 'owner',
          },
        ]);
      }
      setErrors({});
    }
  }, [isOpen, editingProject, selectedCompanyId, companies]);

  // Auto-generate code from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing && !code) {
      const autoCode = value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 20);
      setCode(autoCode);
    }
  };

  // Participant handlers
  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: generateParticipantId(),
        name: '',
        email: '',
        ownershipPercentage: 0,
        role: 'investor',
      },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipantField = (
    id: string,
    field: keyof ProjectParticipant,
    value: string | number | undefined
  ) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Project name is required';
    if (!code.trim()) newErrors.code = 'Project code is required';
    if (!companyId) newErrors.companyId = 'Company is required';

    // Validate participants
    const participantValidation = validateParticipants(participants);
    if (!participantValidation.isValid) {
      newErrors.participants = participantValidation.errors.join('; ');
    }

    // Check for empty participant names
    participants.forEach((p, index) => {
      if (!p.name.trim()) {
        newErrors[`participant_${index}_name`] = 'Participant name is required';
      }
    });

    // Validate management fee (optional, but must be valid if provided)
    if (managementFeePercentage !== undefined && managementFeePercentage !== null) {
      if (managementFeePercentage < 0 || managementFeePercentage > 100) {
        newErrors.managementFeePercentage = 'Management fee must be between 0 and 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save handler
  const handleSave = async () => {
    if (!validate()) return;

    const projectData: Partial<Project> = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      companyId,
      type,
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status,
      notes: notes.trim() || undefined,
      managementFeePercentage: managementFeePercentage,
      participants: participants.map((p) => ({
        ...p,
        name: p.name.trim(),
        email: p.email?.trim() || undefined,
        phone: p.phone?.trim() || undefined,
        notes: p.notes?.trim() || undefined,
      })),
    };

    setSaving(true);
    try {
      const dbData = frontendProjectToDb(projectData);
      if (isEditing && editingProject) {
        await projectsApi.update(editingProject.id, dbData);
      } else {
        await projectsApi.create(dbData);
      }
      onSave();
    } catch (e) {
      console.error('Failed to save project:', e);
      setErrors({ save: e instanceof Error ? e.message : 'Failed to save project' });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals for display
  const ownershipTotal = participants.reduce((sum, p) => sum + (p.ownershipPercentage || 0), 0);

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
              <Anchor className="h-5 w-5 text-[#5A7A8F]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Project' : 'New Project'}
              </h2>
              {isEditing && editingProject && (
                <p className="text-sm text-gray-500">{editingProject.code}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {/* Basic Info */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="project-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Ocean Star"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="project-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="project-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., OCEAN-STAR"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] font-mono ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                </div>

                <div>
                  <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="company-select"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                      errors.companyId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {errors.companyId && <p className="mt-1 text-xs text-red-600">{errors.companyId}</p>}
                </div>

                <div>
                  <label htmlFor="project-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    id="project-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as ProjectType)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  >
                    {projectTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="project-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="project-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of the project..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                />
              </div>
            </div>

            {/* Participants Section */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#5A7A8F]" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Participants & Ownership
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-lg hover:bg-[#5A7A8F]/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Participant
                </button>
              </div>

              {/* Totals indicator */}
              <div className="flex gap-4 mb-4 text-sm">
                <div
                  className={`px-3 py-1.5 rounded-lg ${
                    Math.abs(ownershipTotal - 100) < 0.01
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  Ownership: {ownershipTotal.toFixed(1)}% / 100%
                </div>
              </div>

              {errors.participants && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{errors.participants}</p>
                </div>
              )}

              {/* Participants Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Name <span className="text-red-500">*</span>
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Ownership %
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-40">
                        Capital Invested
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant, index) => (
                      <tr key={participant.id}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) =>
                              updateParticipantField(participant.id, 'name', e.target.value)
                            }
                            placeholder="Participant name"
                            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F] ${
                              errors[`participant_${index}_name`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={participant.email || ''}
                            onChange={(e) =>
                              updateParticipantField(participant.id, 'email', e.target.value)
                            }
                            placeholder="email@example.com"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={participant.role}
                            onChange={(e) =>
                              updateParticipantField(
                                participant.id,
                                'role',
                                e.target.value as ProjectParticipant['role']
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                          >
                            {participantRoles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={participant.ownershipPercentage}
                            onChange={(e) =>
                              updateParticipantField(
                                participant.id,
                                'ownershipPercentage',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <select
                              value={participant.capitalCurrency || 'THB'}
                              onChange={(e) =>
                                updateParticipantField(participant.id, 'capitalCurrency', e.target.value)
                              }
                              className="w-20 px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                            >
                              {currencies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={participant.capitalInvested ?? ''}
                              onChange={(e) =>
                                updateParticipantField(
                                  participant.id,
                                  'capitalInvested',
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeParticipant(participant.id)}
                            disabled={participants.length <= 1}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove participant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Management Fee */}
            <div className="mb-6">
              <div className="max-w-xs">
                <label htmlFor="mgmt-fee" className="block text-sm font-medium text-gray-700 mb-1">
                  Management Fee %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="mgmt-fee"
                    value={managementFeePercentage ?? ''}
                    onChange={(e) => setManagementFeePercentage(
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    className={`w-full px-3 py-2 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                      errors.managementFeePercentage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                </div>
                {errors.managementFeePercentage && (
                  <p className="mt-1 text-xs text-red-600">{errors.managementFeePercentage}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Fee charged for managing this project (used in P&L calculations)
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Save Error Display */}
          {errors.save && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.save}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingCompanies}
              className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
