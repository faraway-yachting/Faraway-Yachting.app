'use client';

import { CashCollection } from '@/lib/supabase/api/cashCollections';

interface UserInfo {
  id: string;
  full_name: string;
}

interface CashCollectionTableProps {
  collections: CashCollection[];
  users: UserInfo[];
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string, selected: boolean) => void;
  selectedIds?: Set<string>;
  selectable?: boolean;
}

const statusStyles: Record<string, string> = {
  collected: 'bg-yellow-100 text-yellow-800',
  pending_handover: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  collected: 'Collected',
  pending_handover: 'Pending Handover',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

function formatAmount(n: number, currency: string) {
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CashCollectionTable({
  collections,
  users,
  showActions = false,
  onAccept,
  onReject,
  onDelete,
  onSelect,
  selectedIds,
  selectable = false,
}: CashCollectionTableProps) {
  const getUserName = (id: string | null) => {
    if (!id) return '—';
    return users.find(u => u.id === id)?.full_name || id.slice(0, 8);
  };

  if (collections.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No cash collections found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {selectable && <th className="px-3 py-2 w-8"></th>}
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Collected By</th>
            <th className="px-3 py-2">Collected At</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Handed To</th>
            <th className="px-3 py-2">Notes</th>
            {showActions && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {collections.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              {selectable && (
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(c.id) ?? false}
                    onChange={(e) => onSelect?.(c.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </td>
              )}
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                {formatAmount(c.amount, c.currency)}
              </td>
              <td className="px-3 py-2 text-gray-700">{getUserName(c.collected_by)}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(c.collected_at)}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[c.status] ?? statusStyles.collected}`}>
                  {statusLabels[c.status] ?? c.status}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-700">{getUserName(c.handed_over_to)}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">
                {c.collection_notes || c.handover_notes || c.rejection_reason || '—'}
              </td>
              {showActions && (
                <td className="px-3 py-2 text-right space-x-2">
                  {c.status === 'pending_handover' && onAccept && (
                    <button
                      onClick={() => onAccept(c.id)}
                      className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Accept
                    </button>
                  )}
                  {c.status === 'pending_handover' && onReject && (
                    <button
                      onClick={() => onReject(c.id)}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  )}
                  {c.status === 'collected' && onDelete && (
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
