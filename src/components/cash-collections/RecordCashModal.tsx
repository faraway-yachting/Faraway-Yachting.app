'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { CurrencySelect } from '@/components/shared/CurrencySelect';

interface CashEditData {
  id: string;
  amount: number;
  currency: string;
  collected_by: string;
  collection_notes: string | null;
}

interface RecordCashModalProps {
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    currency: string;
    collected_by_id: string;
    collection_notes?: string;
    booking_id?: string;
  }) => Promise<void>;
  bookingId?: string;
  defaultCurrency?: string;
  currentUserId: string;
  users: { id: string; full_name: string | null; email: string }[];
  editData?: CashEditData;
  onDelete?: (id: string) => Promise<void>;
}

export default function RecordCashModal({
  onClose,
  onSubmit,
  bookingId,
  defaultCurrency = 'THB',
  currentUserId,
  users,
  editData,
  onDelete,
}: RecordCashModalProps) {
  const isEditing = !!editData;
  const [amount, setAmount] = useState(editData ? String(editData.amount) : '');
  const [currency, setCurrency] = useState(editData?.currency || defaultCurrency);
  const [collectedById, setCollectedById] = useState(editData?.collected_by || currentUserId);
  const [notes, setNotes] = useState(editData?.collection_notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        amount: parseFloat(amount),
        currency,
        collected_by_id: collectedById,
        collection_notes: notes || undefined,
        booking_id: bookingId,
      });
      onClose();
    } catch (err) {
      console.error('Failed to record cash:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editData || !onDelete) return;
    if (!confirm('Are you sure you want to delete this cash collection?')) return;
    setDeleting(true);
    try {
      await onDelete(editData.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete cash:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Cash Collection' : 'Record Cash Collection'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                required
                autoFocus
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <CurrencySelect
                value={currency}
                onChange={(val) => setCurrency(val)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collected By</label>
            <select
              value={collectedById}
              onChange={(e) => setCollectedById(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about the collection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting || !amount}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f] disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Record Cash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
