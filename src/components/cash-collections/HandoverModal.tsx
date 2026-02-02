'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface UserInfo {
  id: string;
  full_name: string;
}

interface HandoverModalProps {
  onClose: () => void;
  onSubmit: (handedOverTo: string, notes?: string) => Promise<void>;
  users: UserInfo[];
  selectedCount: number;
  totalAmount: string;
}

export default function HandoverModal({
  onClose,
  onSubmit,
  users,
  selectedCount,
  totalAmount,
}: HandoverModalProps) {
  const [recipientId, setRecipientId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) return;
    setSaving(true);
    try {
      await onSubmit(recipientId, notes || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to initiate handover:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Hand Over Cash</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-600">
              Handing over <span className="font-semibold text-gray-900">{selectedCount}</span> collection{selectedCount !== 1 ? 's' : ''} totalling <span className="font-semibold text-gray-900">{totalAmount}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hand Over To</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
              required
            >
              <option value="">Select recipient...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
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
              placeholder="Optional handover notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !recipientId}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f] disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Confirm Handover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
