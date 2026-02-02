'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, ChevronDown, Search, Pencil, Trash2 } from 'lucide-react';
import { bookingLookupsApi, BookingLookup, BookingLookupCategory } from '@/lib/supabase/api/bookingLookups';

interface DynamicSelectProps {
  category: BookingLookupCategory;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowCustomInput?: boolean;
  allowEditOptions?: boolean;
}

export function DynamicSelect({
  category,
  value,
  onChange,
  disabled,
  placeholder = 'Select...',
  className = '',
  allowCustomInput = false,
  allowEditOptions = false,
}: DynamicSelectProps) {
  const [options, setOptions] = useState<BookingLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [customInput, setCustomInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await bookingLookupsApi.getByCategory(category);
        if (mounted) setOptions(data);
      } catch (err) {
        console.error(`Failed to load ${category} options:`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [category]);

  // Sync customInput with value when not focused
  useEffect(() => {
    if (allowCustomInput && !isOpen) {
      const label = options.find((o) => o.value === value)?.label || value || '';
      setCustomInput(label);
    }
  }, [value, options, allowCustomInput, isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (allowCustomInput && customInput.trim() && customInput !== value) {
          // Check if typed text matches an option label
          const match = options.find(o => o.label.toLowerCase() === customInput.trim().toLowerCase());
          onChange(match ? match.value : customInput.trim());
        }
        setIsOpen(false);
        setShowAdd(false);
        setSearch('');
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustomInput, customInput, value, options, onChange]);

  const filtered = options.filter((o) => {
    const term = allowCustomInput ? customInput : search;
    return o.label.toLowerCase().includes((term || '').toLowerCase());
  });

  const selectedLabel = options.find((o) => o.value === value)?.label || value || '';

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const newValue = newLabel.trim();
      const created = await bookingLookupsApi.create({
        category,
        value: newValue,
        label: newValue,
        sort_order: options.length + 1,
      });
      setOptions((prev) => [...prev, created]);
      onChange(created.value);
      setNewLabel('');
      setShowAdd(false);
      setIsOpen(false);
    } catch {
      alert('Failed to add. The name may already exist.');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (opt: BookingLookup) => {
    if (!editLabel.trim()) return;
    try {
      await bookingLookupsApi.update(opt.id, { label: editLabel.trim(), value: editLabel.trim() });
      setOptions((prev) =>
        prev.map((o) => (o.id === opt.id ? { ...o, label: editLabel.trim(), value: editLabel.trim() } : o))
      );
      if (value === opt.value) {
        onChange(editLabel.trim());
      }
      setEditingId(null);
      setEditLabel('');
    } catch {
      alert('Failed to update option.');
    }
  };

  const handleDelete = async (opt: BookingLookup) => {
    if (!confirm(`Delete "${opt.label}"?`)) return;
    try {
      await bookingLookupsApi.delete(opt.id);
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
      if (value === opt.value) {
        onChange('');
      }
    } catch {
      alert('Failed to delete option.');
    }
  };

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
    if (allowCustomInput) {
      const label = options.find(o => o.value === optValue)?.label || optValue;
      setCustomInput(label);
    }
  };

  if (disabled) {
    return (
      <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-gray-700 ${className}`}>
        {selectedLabel || <span className="text-gray-400">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {allowCustomInput ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (customInput.trim()) {
                  const match = options.find(o => o.label.toLowerCase() === customInput.trim().toLowerCase());
                  onChange(match ? match.value : customInput.trim());
                }
                setIsOpen(false);
              }
              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            tabIndex={-1}
          >
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`}
        >
          <span className={selectedLabel ? 'text-gray-700' : 'text-gray-400'}>
            {loading ? 'Loading...' : (selectedLabel || placeholder)}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && !loading && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Search (only for non-custom-input mode with many options) */}
          {!allowCustomInput && options.length > 5 && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* Empty option */}
            <button
              type="button"
              onClick={() => { handleSelectOption(''); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              {placeholder}
            </button>

            {filtered.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-center group ${opt.value === value ? 'bg-blue-50' : ''}`}
              >
                {editingId === opt.id ? (
                  <div className="flex items-center gap-1 w-full px-2 py-1">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit(opt);
                        if (e.key === 'Escape') { setEditingId(null); setEditLabel(''); }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleEdit(opt)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditLabel(''); }}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(opt.value)}
                      className="flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span>{opt.label}</span>
                      {opt.value === value && <Check className="h-3.5 w-3.5 text-[#5A7A8F]" />}
                    </button>
                    {allowEditOptions && (
                      <div className="hidden group-hover:flex items-center gap-0.5 pr-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(opt.id);
                            setEditLabel(opt.label);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(opt);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">No options found</div>
            )}
          </div>

          {/* Add new */}
          <div className="border-t border-gray-100 p-2">
            {showAdd ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="New option name..."
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setShowAdd(false); setNewLabel(''); }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !newLabel.trim()}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setNewLabel(''); }}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add new option
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
