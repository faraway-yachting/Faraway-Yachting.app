'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, BedDouble, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectCabin } from '@/data/booking/types';
import { projectCabinsApi } from '@/lib/supabase/api/projectCabins';

// Position presets for cabin location
const positionPresets = [
  'Bow Port (front left)',
  'Bow STBD (front right)',
  'Midship Port (middle left)',
  'Midship STBD (middle right)',
  'Aft Port (rear left)',
  'Aft STBD (rear right)',
  'Master (aft center)',
  'VIP (bow center)',
] as const;

interface ProjectCabinSettingsProps {
  projectId: string;
  projectName: string;
  canEdit?: boolean;
}

export function ProjectCabinSettings({
  projectId,
  projectName,
  canEdit = true,
}: ProjectCabinSettingsProps) {
  const [cabins, setCabins] = useState<ProjectCabin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCabinId, setEditingCabinId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    cabinName: '',
    cabinNumber: '',
    position: '',
    maxGuests: '2',
    isEnsuite: true,
  });
  const [showCustomPosition, setShowCustomPosition] = useState(false);

  // Load cabins
  useEffect(() => {
    async function loadCabins() {
      try {
        const data = await projectCabinsApi.getByProjectId(projectId);
        setCabins(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('project_cabins') || errorMessage.includes('relation')) {
          console.warn('Project cabins table not yet created. Run the migration first.');
        } else {
          console.error('Error loading project cabins:', error);
        }
        setCabins([]);
      } finally {
        setIsLoading(false);
      }
    }
    if (isExpanded) {
      loadCabins();
    }
  }, [projectId, isExpanded]);

  const resetForm = () => {
    setFormData({
      cabinName: '',
      cabinNumber: '',
      position: '',
      maxGuests: '2',
      isEnsuite: true,
    });
    setShowCustomPosition(false);
    setShowAddForm(false);
    setEditingCabinId(null);
  };

  const handlePositionChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomPosition(true);
      setFormData(prev => ({ ...prev, position: '' }));
    } else {
      setShowCustomPosition(false);
      setFormData(prev => ({ ...prev, position: value }));
    }
  };

  const handleAddCabin = async () => {
    if (!formData.cabinName.trim() || !formData.cabinNumber.trim()) return;

    try {
      const newCabin = await projectCabinsApi.create({
        projectId,
        cabinName: formData.cabinName.trim(),
        cabinNumber: parseInt(formData.cabinNumber, 10),
        position: formData.position.trim() || undefined,
        maxGuests: parseInt(formData.maxGuests, 10) || 2,
        isEnsuite: formData.isEnsuite,
        sortOrder: cabins.length,
      });
      setCabins(prev => [...prev, newCabin]);
      resetForm();
    } catch (error) {
      console.error('Error adding cabin:', error);
    }
  };

  const handleStartEdit = (cabin: ProjectCabin) => {
    setEditingCabinId(cabin.id);
    setFormData({
      cabinName: cabin.cabinName,
      cabinNumber: cabin.cabinNumber.toString(),
      position: cabin.position || '',
      maxGuests: cabin.maxGuests.toString(),
      isEnsuite: cabin.isEnsuite,
    });
    const isCustomPosition = cabin.position && !positionPresets.includes(cabin.position as typeof positionPresets[number]);
    setShowCustomPosition(!!isCustomPosition);
    setShowAddForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCabinId || !formData.cabinName.trim() || !formData.cabinNumber.trim()) return;

    try {
      const updated = await projectCabinsApi.update(editingCabinId, {
        cabinName: formData.cabinName.trim(),
        cabinNumber: parseInt(formData.cabinNumber, 10),
        position: formData.position.trim() || undefined,
        maxGuests: parseInt(formData.maxGuests, 10) || 2,
        isEnsuite: formData.isEnsuite,
      });
      setCabins(prev => prev.map(c => (c.id === editingCabinId ? updated : c)));
      resetForm();
    } catch (error) {
      console.error('Error updating cabin:', error);
    }
  };

  const handleDeleteCabin = async (id: string) => {
    try {
      await projectCabinsApi.delete(id);
      setCabins(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting cabin:', error);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      {/* Header with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            Cabins ({cabins.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Cabin list */}
              {cabins.length > 0 ? (
                <div className="space-y-2">
                  {cabins.map(cabin => (
                    <div
                      key={cabin.id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {cabin.cabinName}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                              Cabin {cabin.cabinNumber}
                            </span>
                            {cabin.isEnsuite && (
                              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                                Ensuite
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                            {cabin.position && (
                              <div>
                                <span className="text-gray-400">Position:</span>{' '}
                                {cabin.position}
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400">Max Guests:</span>{' '}
                              {cabin.maxGuests}
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleStartEdit(cabin)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCabin(cabin.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No cabins configured for {projectName}
                </div>
              )}

              {/* Add/Edit Form */}
              {showAddForm ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-indigo-900">
                      {editingCabinId ? 'Edit Cabin' : 'Add Cabin'}
                    </h4>
                    <button
                      onClick={resetForm}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Cabin Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cabin Name *
                      </label>
                      <input
                        type="text"
                        value={formData.cabinName}
                        onChange={e => setFormData(prev => ({ ...prev, cabinName: e.target.value }))}
                        placeholder="e.g., Chili Cabin"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Cabin Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cabin Number *
                      </label>
                      <input
                        type="number"
                        value={formData.cabinNumber}
                        onChange={e => setFormData(prev => ({ ...prev, cabinNumber: e.target.value }))}
                        placeholder="e.g., 1"
                        min="1"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      {showCustomPosition ? (
                        <input
                          type="text"
                          value={formData.position}
                          onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="Custom position"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      ) : (
                        <select
                          value={formData.position}
                          onChange={e => handlePositionChange(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select position...</option>
                          {positionPresets.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                      )}
                    </div>

                    {/* Max Guests */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Guests
                      </label>
                      <input
                        type="number"
                        value={formData.maxGuests}
                        onChange={e => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                        min="1"
                        max="10"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Ensuite Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`ensuite-${projectId}`}
                      checked={formData.isEnsuite}
                      onChange={e => setFormData(prev => ({ ...prev, isEnsuite: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`ensuite-${projectId}`} className="text-sm text-gray-700">
                      Ensuite bathroom
                    </label>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={resetForm}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingCabinId ? handleSaveEdit : handleAddCabin}
                      disabled={!formData.cabinName.trim() || !formData.cabinNumber.trim()}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingCabinId ? 'Save Changes' : 'Add Cabin'}
                    </button>
                  </div>
                </div>
              ) : (
                canEdit && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Cabin
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
