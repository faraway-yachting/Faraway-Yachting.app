'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import { Palette, RotateCcw, Ship, Check, Plus, Trash2, Anchor, Image, X, Upload, Link } from 'lucide-react';
import { Project } from '@/data/project/types';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';
import { useBookingSettings } from '@/contexts/BookingSettingsContext';
import { defaultBoatColors, defaultExternalBoatColor } from '@/data/booking/types';
import { YachtProductManager } from '@/components/bookings/YachtProductManager';

// Preset marina locations for "Depart From"
const marinaPresets = [
  'Ao Po Grand Marina',
  'Royal Phuket Marina',
  'Yacht Haven Marina',
  'Boat Lagoon Marina',
  'Chalong Pier',
];

// Preset color palette
const colorPalette = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#64748B', // Slate
  '#14B8A6', // Teal
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#22C55E', // Green
  '#0EA5E9', // Sky
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

function ColorPicker({ color, onChange, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position dropdown below the button, aligned to the right
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - 220), // 220px is dropdown width, ensure 8px from left edge
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 hover:shadow-md cursor-pointer'}
        `}
        style={{ backgroundColor: color }}
        disabled={disabled}
      />

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[220px]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <p className="text-xs font-medium text-gray-500 mb-2">Select a color</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className={`
                    w-10 h-10 rounded-lg border-2 transition-all hover:scale-110
                    ${color === c ? 'border-gray-800 ring-2 ring-gray-300' : 'border-transparent hover:border-gray-300'}
                  `}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check className="h-4 w-4 text-white mx-auto drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-medium text-gray-500 mb-2">Custom color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer border border-gray-200"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function BookingSettingsPage() {
  const params = useParams();
  const role = params.role as string;
  const canEdit = role === 'admin' || role === 'manager';

  const {
    getBoatColor,
    setBoatColor,
    resetToDefaults,
    externalBoats,
    addExternalYacht,
    removeExternalYacht,
    updateExternalYacht,
    bannerImageUrl,
    setBannerImageUrl,
  } = useBookingSettings();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [bannerUrlInput, setBannerUrlInput] = useState(bannerImageUrl || '');
  const [bannerInputMode, setBannerInputMode] = useState<'url' | 'upload'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [yachtRegisterTab, setYachtRegisterTab] = useState<'external' | 'own'>('external');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New yacht form state
  const [newYachtName, setNewYachtName] = useState('');
  const [newYachtDisplayName, setNewYachtDisplayName] = useState('');
  const [newYachtDepartFrom, setNewYachtDepartFrom] = useState('');
  const [newYachtOwnerOperator, setNewYachtOwnerOperator] = useState('');
  const [showCustomDepartFrom, setShowCustomDepartFrom] = useState(false);

  // Edit yacht state
  const [editingYachtId, setEditingYachtId] = useState<string | null>(null);
  const [editYachtName, setEditYachtName] = useState('');
  const [editYachtDisplayName, setEditYachtDisplayName] = useState('');
  const [editYachtDepartFrom, setEditYachtDepartFrom] = useState('');
  const [editYachtOwnerOperator, setEditYachtOwnerOperator] = useState('');
  const [showEditCustomDepartFrom, setShowEditCustomDepartFrom] = useState(false);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.getActive();
        const yachts = data
          .map(dbProjectToFrontend)
          .filter(p => p.type === 'yacht');
        setProjects(yachts);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  const handleColorChange = (id: string, name: string, color: string) => {
    if (!canEdit) return;
    setBoatColor(id, name, color);
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
  };

  // Add new yacht
  const handleAddExternalYacht = () => {
    if (newYachtName.trim() && newYachtDisplayName.trim()) {
      addExternalYacht({
        name: newYachtName.trim(),
        displayName: newYachtDisplayName.trim(),
        departFrom: newYachtDepartFrom.trim(),
        ownerOperator: newYachtOwnerOperator.trim(),
      });
      // Reset form
      setNewYachtName('');
      setNewYachtDisplayName('');
      setNewYachtDepartFrom('');
      setNewYachtOwnerOperator('');
      setShowCustomDepartFrom(false);
    }
  };

  // Start editing yacht
  const handleStartEditYacht = (yacht: typeof externalBoats[0]) => {
    setEditingYachtId(yacht.id);
    setEditYachtName(yacht.name);
    setEditYachtDisplayName(yacht.displayName || yacht.name);
    setEditYachtDepartFrom(yacht.departFrom || '');
    setEditYachtOwnerOperator(yacht.ownerOperator || '');
    // Check if departFrom is custom (not in presets)
    setShowEditCustomDepartFrom(
      yacht.departFrom ? !marinaPresets.includes(yacht.departFrom) : false
    );
  };

  // Save yacht edit
  const handleSaveYachtEdit = () => {
    if (editingYachtId && editYachtName.trim() && editYachtDisplayName.trim()) {
      updateExternalYacht(editingYachtId, {
        name: editYachtName.trim(),
        displayName: editYachtDisplayName.trim(),
        departFrom: editYachtDepartFrom.trim(),
        ownerOperator: editYachtOwnerOperator.trim(),
      });
    }
    handleCancelYachtEdit();
  };

  // Cancel yacht edit
  const handleCancelYachtEdit = () => {
    setEditingYachtId(null);
    setEditYachtName('');
    setEditYachtDisplayName('');
    setEditYachtDepartFrom('');
    setEditYachtOwnerOperator('');
    setShowEditCustomDepartFrom(false);
  };

  // Handle depart from dropdown change
  const handleDepartFromChange = (value: string, isEdit = false) => {
    if (value === 'other') {
      if (isEdit) {
        setShowEditCustomDepartFrom(true);
        setEditYachtDepartFrom('');
      } else {
        setShowCustomDepartFrom(true);
        setNewYachtDepartFrom('');
      }
    } else {
      if (isEdit) {
        setShowEditCustomDepartFrom(false);
        setEditYachtDepartFrom(value);
      } else {
        setShowCustomDepartFrom(false);
        setNewYachtDepartFrom(value);
      }
    }
  };

  // Handle file upload for banner
  const handleBannerFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBannerImageUrl(dataUrl);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure booking calendar display options</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Colors?</h3>
            <p className="text-gray-600 text-sm mb-4">
              This will reset all boat colors to their default values. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Banner Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Calendar Banner</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Display a banner image at the top of the calendar (height: 5cm)
          </p>
        </div>

        <div className="p-6">
          {/* Banner preview */}
          {bannerImageUrl && (
            <div className="mb-4 relative">
              <div className="w-full overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={bannerImageUrl}
                  alt="Calendar banner preview"
                  className="w-full object-cover"
                  style={{ height: '189px' }}
                />
              </div>
              {canEdit && (
                <button
                  onClick={() => {
                    setBannerImageUrl(null);
                    setBannerUrlInput('');
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Input mode toggle and inputs */}
          {canEdit && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => setBannerInputMode('upload')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    bannerInputMode === 'upload'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={() => setBannerInputMode('url')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    bannerInputMode === 'url'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Link className="h-4 w-4" />
                  URL
                </button>
              </div>

              {/* Upload input */}
              {bannerInputMode === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label
                    htmlFor="banner-upload"
                    className={`
                      flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
                      transition-colors
                      ${isUploading
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                      }
                    `}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
                        <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600 font-medium">Click to upload an image</span>
                        <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* URL input */}
              {bannerInputMode === 'url' && (
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={bannerUrlInput}
                    onChange={(e) => setBannerUrlInput(e.target.value)}
                    placeholder="Enter image URL..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && bannerUrlInput.trim()) {
                        setBannerImageUrl(bannerUrlInput.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (bannerUrlInput.trim()) {
                        setBannerImageUrl(bannerUrlInput.trim());
                      }
                    }}
                    disabled={!bannerUrlInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bannerImageUrl ? 'Update' : 'Set'} Banner
                  </button>
                </div>
              )}
            </div>
          )}

          {!bannerImageUrl && !canEdit && (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No banner image set</p>
            </div>
          )}
        </div>
      </div>

      {/* Yacht Register Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Yacht Register</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage yachts that can be used in bookings
          </p>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
            <button
              onClick={() => setYachtRegisterTab('external')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                yachtRegisterTab === 'external'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              External Yacht
            </button>
            <button
              onClick={() => setYachtRegisterTab('own')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                yachtRegisterTab === 'own'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Own Yacht
            </button>
          </div>

          {/* External Yacht Tab */}
          {yachtRegisterTab === 'external' && (
            <>
              {/* Add new yacht form */}
              {canEdit && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Add New External Yacht</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Yacht Name *</label>
                      <input
                        type="text"
                        value={newYachtName}
                        onChange={(e) => setNewYachtName(e.target.value)}
                        placeholder="e.g., Ocean Paradise"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Display Name *</label>
                      <input
                        type="text"
                        value={newYachtDisplayName}
                        onChange={(e) => setNewYachtDisplayName(e.target.value)}
                        placeholder="e.g., Ocean"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Depart From</label>
                      {showCustomDepartFrom ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newYachtDepartFrom}
                            onChange={(e) => setNewYachtDepartFrom(e.target.value)}
                            placeholder="Enter custom location..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomDepartFrom(false);
                              setNewYachtDepartFrom('');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={newYachtDepartFrom}
                          onChange={(e) => handleDepartFromChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select marina...</option>
                          {marinaPresets.map((marina) => (
                            <option key={marina} value={marina}>{marina}</option>
                          ))}
                          <option value="other">Other (Custom)</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Owner/Operator</label>
                      <input
                        type="text"
                        value={newYachtOwnerOperator}
                        onChange={(e) => setNewYachtOwnerOperator(e.target.value)}
                        placeholder="e.g., ABC Yachts Co."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleAddExternalYacht}
                      disabled={!newYachtName.trim() || !newYachtDisplayName.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Yacht
                    </button>
                  </div>
                </div>
              )}

              {/* List of external yachts */}
              {externalBoats.length > 0 ? (
                <div className="space-y-3">
                  {externalBoats.map((yacht) => (
                    <div
                      key={yacht.id}
                      className="bg-gray-50 rounded-lg overflow-hidden"
                    >
                      {editingYachtId === yacht.id ? (
                        // Edit mode
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Yacht Name *</label>
                              <input
                                type="text"
                                value={editYachtName}
                                onChange={(e) => setEditYachtName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Display Name *</label>
                              <input
                                type="text"
                                value={editYachtDisplayName}
                                onChange={(e) => setEditYachtDisplayName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Depart From</label>
                              {showEditCustomDepartFrom ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editYachtDepartFrom}
                                    onChange={(e) => setEditYachtDepartFrom(e.target.value)}
                                    placeholder="Enter custom location..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowEditCustomDepartFrom(false);
                                      setEditYachtDepartFrom('');
                                    }}
                                    className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={marinaPresets.includes(editYachtDepartFrom) ? editYachtDepartFrom : ''}
                                  onChange={(e) => handleDepartFromChange(e.target.value, true)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select marina...</option>
                                  {marinaPresets.map((marina) => (
                                    <option key={marina} value={marina}>{marina}</option>
                                  ))}
                                  <option value="other">Other (Custom)</option>
                                </select>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Owner/Operator</label>
                              <input
                                type="text"
                                value={editYachtOwnerOperator}
                                onChange={(e) => setEditYachtOwnerOperator(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              onClick={handleCancelYachtEdit}
                              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveYachtEdit}
                              disabled={!editYachtName.trim() || !editYachtDisplayName.trim()}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <Ship className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              <div className="grid grid-cols-4 gap-4 flex-1">
                                <div>
                                  <p className="text-xs text-gray-500">Yacht Name</p>
                                  <p className="font-medium text-gray-900">{yacht.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Display Name</p>
                                  <p className="text-gray-700">{yacht.displayName || yacht.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Depart From</p>
                                  <p className="text-gray-700">{yacht.departFrom || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Owner/Operator</p>
                                  <p className="text-gray-700">{yacht.ownerOperator || '-'}</p>
                                </div>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleStartEditYacht(yacht)}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeExternalYacht(yacht.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Products for this external yacht */}
                          <YachtProductManager
                            yachtSource="external"
                            yachtId={yacht.id}
                            yachtName={yacht.name}
                            canEdit={canEdit}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Anchor className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No external yachts added yet</p>
                  {canEdit && (
                    <p className="text-xs mt-1">Add yachts using the form above</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Own Yacht Tab */}
          {yachtRegisterTab === 'own' && (
            <>
              {projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: getBoatColor(project.id) + '20' }}
                          >
                            <Ship className="h-5 w-5" style={{ color: getBoatColor(project.id) }} />
                          </div>
                          <div className="grid grid-cols-4 gap-4 flex-1">
                            <div>
                              <p className="text-xs text-gray-500">Yacht Name</p>
                              <p className="font-medium text-gray-900">{project.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Code</p>
                              <p className="text-gray-700">{project.code}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Status</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                project.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {project.status === 'active' ? 'Active' : project.status}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Color</p>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-200"
                                  style={{ backgroundColor: getBoatColor(project.id) }}
                                />
                                <span className="text-gray-700 text-sm">{getBoatColor(project.id)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Products for this own yacht */}
                      <YachtProductManager
                        yachtSource="own"
                        yachtId={project.id}
                        yachtName={project.name}
                        canEdit={canEdit}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No yachts found</p>
                  <p className="text-xs mt-1">Add yachts in the Projects section to see them here</p>
                </div>
              )}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Own yachts are managed in the Projects section. Colors can be customized in the Boat Colors section below.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Boat Colors Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Boat Colors</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Assign colors to boats for easy identification on the calendar
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Other Boat + General */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Ship className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Other Boat + General</p>
                <p className="text-xs text-gray-500">External boats and general bookings</p>
              </div>
            </div>
            <ColorPicker
              color={getBoatColor('external')}
              onChange={(color) => handleColorChange('external', 'Other Boat + General', color)}
              disabled={!canEdit}
            />
          </div>

          {/* Owned Yachts */}
          {projects.map((project, index) => (
            <div key={project.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: getBoatColor(project.id) + '20' }}
                >
                  <Ship className="h-5 w-5" style={{ color: getBoatColor(project.id) }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-500">{project.code}</p>
                </div>
              </div>
              <ColorPicker
                color={getBoatColor(project.id)}
                onChange={(color) => handleColorChange(project.id, project.name, color)}
                disabled={!canEdit}
              />
            </div>
          ))}

          {projects.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <Ship className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No yachts found</p>
              <p className="text-xs mt-1">Add yachts in the Projects section to configure their colors</p>
            </div>
          )}
        </div>
      </div>

      {/* Info for non-editors */}
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Only Managers and Admins can modify settings. Contact your administrator to change boat colors.
          </p>
        </div>
      )}

      {/* Preview Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Color Preview</h2>
          <p className="text-sm text-gray-500 mt-1">
            See how your colors will appear on the calendar
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {/* External */}
            <div
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: getBoatColor('external') }}
            >
              Other Boat + General
            </div>
            {/* Boats */}
            {projects.map((project) => (
              <div
                key={project.id}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: getBoatColor(project.id) }}
              >
                {project.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
