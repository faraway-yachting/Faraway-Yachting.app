'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, ChevronDown, Search } from 'lucide-react';
import { bookingLookupsApi, BookingLookup, BookingLookupCategory } from '@/lib/supabase/api/bookingLookups';

interface DynamicMultiSelectProps {
  category: BookingLookupCategory;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DynamicMultiSelect({
  category,
  values,
  onChange,
  disabled,
  placeholder = 'Select...',
  className = '',
}: DynamicMultiSelectProps) {
  const [options, setOptions] = useState<BookingLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAdd(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabels = values
    .map(v => options.find(o => o.value === v)?.label || v)
    .filter(Boolean);

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const newValue = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
      const created = await bookingLookupsApi.create({
        category,
        value: newValue,
        label: newLabel.trim(),
        sort_order: options.length + 1,
      });
      setOptions((prev) => [...prev, created]);
      onChange([...values, created.value]);
      setNewLabel('');
      setShowAdd(false);
    } catch {
      alert('Failed to add. The name may already exist.');
    } finally {
      setAdding(false);
    }
  };

  if (disabled) {
    return (
      <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-gray-700 min-h-[42px] ${className}`}>
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedLabels.map((label, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-200 text-xs text-gray-600">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[42px] ${className}`}
      >
        <div className="flex-1">
          {loading ? (
            <span className="text-gray-400">Loading...</span>
          ) : selectedLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 border border-blue-200"
                >
                  {label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleValue(values[i]);
                    }}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Search */}
          {options.length > 5 && (
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
            {filtered.map((opt) => {
              const isSelected = values.includes(opt.value);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#5A7A8F]" />}
                </button>
              );
            })}

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
