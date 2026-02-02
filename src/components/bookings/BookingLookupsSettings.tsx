'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, Check, X, List } from 'lucide-react';
import { bookingLookupsApi, BookingLookup, BookingLookupCategory } from '@/lib/supabase/api/bookingLookups';

interface LookupSectionProps {
  title: string;
  description: string;
  category: BookingLookupCategory;
  items: BookingLookup[];
  onAdd: (category: BookingLookupCategory, value: string, label: string) => Promise<void>;
  onEdit: (item: BookingLookup, newLabel: string) => Promise<void>;
  onDelete: (item: BookingLookup) => Promise<void>;
}

function LookupSection({ title, description, category, items, onAdd, onEdit, onDelete }: LookupSectionProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(category, newName.trim().toLowerCase().replace(/\s+/g, '_'), newName.trim());
      setNewName('');
    } catch {
      alert('Failed to add. The name may already exist.');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (item: BookingLookup) => {
    if (!editValue.trim() || editValue.trim() === item.label) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      await onEdit(item, editValue.trim());
      setEditingId(null);
    } catch {
      alert('Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: BookingLookup) => {
    if (!confirm(`Delete "${item.label}"? Bookings using this value will keep their current value but it won't appear in the dropdown.`)) return;
    try {
      await onDelete(item);
    } catch {
      alert('Failed to delete.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="p-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editingId === item.id ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-[#5A7A8F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit(item);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <button onClick={() => handleEdit(item)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                <span className="text-xs text-gray-400 font-mono">{item.value}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditValue(item.label); }}
                  className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-gray-400">No items yet.</p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}...`}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

const lookupCategories: { category: BookingLookupCategory; title: string; description: string }[] = [
  { category: 'booking_status', title: 'Booking Statuses', description: 'Status options for bookings (e.g., Enquiry, Hold, Booked).' },
  { category: 'charter_type', title: 'Charter Types', description: 'Types of charter bookings (e.g., Day Charter, Overnight).' },
  { category: 'contact_channel', title: 'Contact Channels', description: 'How customers can be reached (e.g., WhatsApp, Email).' },
  { category: 'agent_platform', title: 'Agent Platforms', description: 'Booking agent platforms (e.g., GetYourGuide, Viator).' },
  { category: 'payment_status', title: 'Payment Statuses', description: 'Payment status options (e.g., Unpaid, Partially Paid, Paid).' },
  { category: 'currency', title: 'Currencies', description: 'Supported currencies for bookings.' },
  { category: 'payment_type', title: 'Payment Types', description: 'Types of payment records (e.g., Deposit, Balance).' },
  { category: 'time_preset', title: 'Time Presets', description: 'Quick-select time ranges for bookings.' },
  { category: 'destination', title: 'Destinations', description: 'Common charter destinations.' },
  { category: 'departure_location', title: 'Departure Locations', description: 'Piers and marinas for departure.' },
  { category: 'arrival_location', title: 'Arrival Locations', description: 'Piers and marinas for arrival.' },
];

export default function BookingLookupsSettings() {
  const [lookups, setLookups] = useState<Record<string, BookingLookup[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data: Record<string, BookingLookup[]> = {};
      // Load all categories
      for (const cat of lookupCategories) {
        data[cat.category] = await bookingLookupsApi.getAllByCategory(cat.category);
      }
      setLookups(data);
    } catch (error) {
      console.error('Failed to load lookups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async (category: BookingLookupCategory, value: string, label: string) => {
    const items = lookups[category] || [];
    const created = await bookingLookupsApi.create({
      category,
      value,
      label,
      sort_order: items.length + 1,
    });
    setLookups((prev) => ({
      ...prev,
      [category]: [...(prev[category] || []), created],
    }));
  };

  const handleEdit = async (item: BookingLookup, newLabel: string) => {
    const newValue = newLabel.toLowerCase().replace(/\s+/g, '_');
    await bookingLookupsApi.update(item.id, { label: newLabel, value: newValue });
    setLookups((prev) => ({
      ...prev,
      [item.category]: (prev[item.category] || []).map((l) =>
        l.id === item.id ? { ...l, label: newLabel, value: newValue } : l
      ),
    }));
  };

  const handleDelete = async (item: BookingLookup) => {
    await bookingLookupsApi.delete(item.id);
    setLookups((prev) => ({
      ...prev,
      [item.category]: (prev[item.category] || []).filter((l) => l.id !== item.id),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Dropdown Options</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Add, edit, or delete options for all dropdown fields in the booking form
        </p>
      </div>
      <div className="p-6 space-y-6">
        {lookupCategories.map((cat) => (
          <LookupSection
            key={cat.category}
            title={cat.title}
            description={cat.description}
            category={cat.category}
            items={lookups[cat.category] || []}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
