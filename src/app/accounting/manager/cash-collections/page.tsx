'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/accounting/AppShell';
import { cashCollectionsApi, CashCollection } from '@/lib/supabase/api/cashCollections';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth';
import CashCollectionTable from '@/components/cash-collections/CashCollectionTable';
import RecordCashModal from '@/components/cash-collections/RecordCashModal';
import HandoverModal from '@/components/cash-collections/HandoverModal';
import { Banknote, History, BarChart3 } from 'lucide-react';

type Tab = 'pending' | 'history' | 'summary';

interface UserInfo {
  id: string;
  full_name: string;
  email?: string;
}

interface CompanyInfo {
  id: string;
  name: string;
}

export default function CashCollectionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [companyId, setCompanyId] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Date filter for history
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load companies and users
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      (supabase as any).from('companies').select('id, name').order('name'),
      (supabase as any).from('user_profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
    ]).then(([compRes, userRes]) => {
      const comps = (compRes.data ?? []) as CompanyInfo[];
      setCompanies(comps);
      // Default to 'all' — no need to auto-select first company
      setUsers((userRes.data ?? []).map((u: any) => ({ id: u.id, full_name: u.full_name || u.id.slice(0, 8), email: u.email })));
    }).catch(console.error);
  }, []);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = companyId === 'all'
        ? await cashCollectionsApi.getAll()
        : await cashCollectionsApi.getByCompany(companyId);
      setCollections(data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Filtered collections for each tab
  const pendingCollections = collections.filter(c => c.status === 'collected' || c.status === 'pending_handover');

  const historyCollections = collections.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (dateFrom && c.collected_at < dateFrom) return false;
    if (dateTo && c.collected_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  // Summary calculations
  const summarize = (status: string, curr: string) =>
    collections
      .filter(c => {
        if (status === 'unhanded') return c.status === 'collected';
        if (status === 'pending') return c.status === 'pending_handover';
        if (status === 'accepted') return c.status === 'accepted';
        return false;
      })
      .filter(c => c.currency === curr)
      .reduce((sum, c) => sum + c.amount, 0);

  const currencies = [...new Set(collections.map(c => c.currency))];
  if (currencies.length === 0) currencies.push('THB');

  // Handlers
  const handleRecordCash = async (data: { amount: number; currency: string; collected_by_id: string; collection_notes?: string; booking_id?: string }) => {
    if (!user?.id || companyId === 'all') {
      if (companyId === 'all') alert('Please select a specific company before recording cash.');
      return;
    }
    await cashCollectionsApi.create({
      company_id: companyId,
      amount: data.amount,
      currency: data.currency,
      collected_by: data.collected_by_id,
      collection_notes: data.collection_notes,
      booking_id: data.booking_id,
    });
    await loadCollections();
  };

  const handleHandover = async (handedOverTo: string, notes?: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await cashCollectionsApi.initiateHandoverBulk(ids, handedOverTo, notes);
    setSelectedIds(new Set());
    await loadCollections();
  };

  const handleAccept = async (id: string) => {
    if (!user?.id) return;
    await cashCollectionsApi.confirmReceipt(id, user.id);
    await loadCollections();
  };

  const handleReject = async () => {
    if (!rejectingId || !user?.id || !rejectReason) return;
    await cashCollectionsApi.rejectHandover(rejectingId, user.id, rejectReason);
    setRejectingId(null);
    setRejectReason('');
    await loadCollections();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection record?')) return;
    await cashCollectionsApi.delete(id);
    await loadCollections();
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectedTotal = () => {
    const selected = pendingCollections.filter(c => selectedIds.has(c.id) && c.status === 'collected');
    const byCurrency: Record<string, number> = {};
    selected.forEach(c => { byCurrency[c.currency] = (byCurrency[c.currency] || 0) + c.amount; });
    return Object.entries(byCurrency)
      .map(([curr, amt]) => `${curr} ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      .join(', ') || '0.00';
  };

  const formatAmount = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tabs = [
    { id: 'pending' as Tab, label: 'Pending', icon: Banknote, count: pendingCollections.length },
    { id: 'history' as Tab, label: 'History', icon: History },
    { id: 'summary' as Tab, label: 'Summary', icon: BarChart3 },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Collections</h1>
          <p className="text-sm text-gray-500 mt-1">Track cash collected by team and handover to owner</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f]"
          >
            + Record Cash
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#5A7A8F] text-[#5A7A8F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-[#5A7A8F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div>
              {/* Collected - ready for handover */}
              {pendingCollections.filter(c => c.status === 'collected').length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Collected (Not Handed Over)</h3>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={() => setShowHandoverModal(true)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f]"
                      >
                        Hand Over ({selectedIds.size})
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow">
                    <CashCollectionTable
                      collections={pendingCollections.filter(c => c.status === 'collected')}
                      users={users}
                      showActions
                      onDelete={handleDelete}
                      selectable
                      selectedIds={selectedIds}
                      onSelect={handleSelect}
                    />
                  </div>
                </div>
              )}

              {/* Pending handover - awaiting acceptance */}
              {pendingCollections.filter(c => c.status === 'pending_handover').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Pending Acceptance</h3>
                  <div className="bg-white rounded-lg shadow">
                    <CashCollectionTable
                      collections={pendingCollections.filter(c => c.status === 'pending_handover')}
                      users={users}
                      showActions
                      onAccept={handleAccept}
                      onReject={(id) => setRejectingId(id)}
                    />
                  </div>
                </div>
              )}

              {pendingCollections.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No pending cash collections</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="flex gap-3 mb-4">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                  placeholder="To"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="collected">Collected</option>
                  <option value="pending_handover">Pending Handover</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="bg-white rounded-lg shadow">
                <CashCollectionTable collections={historyCollections} users={users} />
              </div>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currencies.map(curr => (
                <div key={curr} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">{curr}</h3>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 mb-1">Collected (Unhanded)</p>
                    <p className="text-xl font-bold text-yellow-600">{formatAmount(summarize('unhanded', curr))}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 mb-1">Pending Handover</p>
                    <p className="text-xl font-bold text-blue-600">{formatAmount(summarize('pending', curr))}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 mb-1">Confirmed</p>
                    <p className="text-xl font-bold text-green-600">{formatAmount(summarize('accepted', curr))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showRecordModal && user?.id && (
        <RecordCashModal
          onClose={() => setShowRecordModal(false)}
          onSubmit={handleRecordCash}
          currentUserId={user.id}
          users={users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email || '' }))}
        />
      )}
      {showHandoverModal && (
        <HandoverModal
          onClose={() => { setShowHandoverModal(false); }}
          onSubmit={handleHandover}
          users={users}
          selectedCount={selectedIds.size}
          totalAmount={selectedTotal()}
        />
      )}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Reject Handover</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
