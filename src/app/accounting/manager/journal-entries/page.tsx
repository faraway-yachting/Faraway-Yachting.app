'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, Plus, FileDown } from 'lucide-react';
import { AppShell } from '@/components/accounting/AppShell';
import { DataTable } from '@/components/accounting/DataTable';
import { KPICard } from '@/components/accounting/KPICard';
import { JournalEntryFormModal } from '@/components/accounting/JournalEntryFormModal';
import {
  JournalEntry,
  JournalEntryStatus,
} from '@/data/accounting/journalEntryTypes';
import {
  getAllJournalEntries,
  deleteJournalEntry,
} from '@/data/accounting/journalEntries';
import { getAllCompanies } from '@/data/company/companies';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>(getAllJournalEntries());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | JournalEntryStatus>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const companies = getAllCompanies();

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Status filter
      if (filterStatus !== 'all' && entry.status !== filterStatus) {
        return false;
      }

      // Company filter
      if (filterCompany !== 'all' && entry.companyId !== filterCompany) {
        return false;
      }

      // Search filter (reference number or description)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesReference = entry.referenceNumber.toLowerCase().includes(search);
        const matchesDescription = entry.description.toLowerCase().includes(search);
        if (!matchesReference && !matchesDescription) {
          return false;
        }
      }

      // Date range filter
      if (startDate && entry.date < startDate) {
        return false;
      }
      if (endDate && entry.date > endDate) {
        return false;
      }

      return true;
    });
  }, [entries, filterStatus, filterCompany, searchTerm, startDate, endDate]);

  // Sort by date (newest first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredEntries]);

  // KPI calculations
  const totalCount = entries.length;
  const draftCount = entries.filter((e) => e.status === 'draft').length;
  const postedCount = entries.filter((e) => e.status === 'posted').length;
  const totalAmount = entries.reduce((sum, e) => sum + e.totalDebit, 0);

  // Handlers
  const handleNewEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    setEntries(getAllJournalEntries());
  };

  const handleDelete = (entry: JournalEntry) => {
    if (entry.status === 'posted') {
      alert('Cannot delete posted journal entries');
      return;
    }

    const confirmMessage = `Are you sure you want to delete journal entry ${entry.referenceNumber}?`;
    if (confirm(confirmMessage)) {
      try {
        deleteJournalEntry(entry.id);
        setEntries(getAllJournalEntries());
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete journal entry');
      }
    }
  };

  const handleExportCSV = () => {
    // Prepare CSV data
    const headers = [
      'Reference Number',
      'Date',
      'Company',
      'Description',
      'Status',
      'Total Debit',
      'Total Credit',
      'Created By',
      'Created At',
    ];

    const rows = sortedEntries.map((entry) => {
      const company = companies.find((c) => c.id === entry.companyId);
      return [
        entry.referenceNumber,
        entry.date,
        company?.name || '',
        entry.description,
        entry.status,
        entry.totalDebit.toString(),
        entry.totalCredit.toString(),
        entry.createdBy,
        new Date(entry.createdAt).toLocaleString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal-entries-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Table columns
  const columns = [
    {
      key: 'referenceNumber' as keyof JournalEntry,
      header: 'Reference',
      render: (entry: JournalEntry) => (
        <span className="font-medium text-gray-900">{entry.referenceNumber}</span>
      ),
    },
    {
      key: 'date' as keyof JournalEntry,
      header: 'Date',
      render: (entry: JournalEntry) => (
        <span className="text-gray-900">
          {new Date(entry.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'companyId' as keyof JournalEntry,
      header: 'Company',
      render: (entry: JournalEntry) => {
        const company = companies.find((c) => c.id === entry.companyId);
        return <span className="text-gray-900">{company?.name || 'Unknown'}</span>;
      },
    },
    {
      key: 'description' as keyof JournalEntry,
      header: 'Description',
      render: (entry: JournalEntry) => (
        <span
          className="text-gray-900 block max-w-md truncate"
          title={entry.description}
        >
          {entry.description}
        </span>
      ),
    },
    {
      key: 'totalDebit' as keyof JournalEntry,
      header: 'Amount',
      render: (entry: JournalEntry) => {
        const company = companies.find((c) => c.id === entry.companyId);
        return (
          <span className="text-gray-900">
            {entry.totalDebit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {company?.currency || 'THB'}
          </span>
        );
      },
    },
    {
      key: 'status' as keyof JournalEntry,
      header: 'Status',
      render: (entry: JournalEntry) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            entry.status === 'posted'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {entry.status === 'posted' ? 'Posted' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'id' as keyof JournalEntry,
      header: 'Actions',
      render: (entry: JournalEntry) => (
        <div className="flex items-center gap-2">
          {entry.status === 'draft' ? (
            <button
              onClick={() => handleEditEntry(entry)}
              className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
              title="Edit journal entry"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleViewEntry(entry)}
              className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
              title="View journal entry"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell currentRole="manager">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage double-entry bookkeeping transactions
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Entries" value={totalCount.toString()} />
          <KPICard title="Draft Entries" value={draftCount.toString()} />
          <KPICard title="Posted Entries" value={postedCount.toString()} />
          <KPICard
            title="Total Amount"
            value={totalAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
        </div>

        {/* Filters & Actions */}
        <div className="space-y-4">
          {/* Top row: Search and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by reference or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handleNewEntry}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Journal Entry
              </button>
            </div>
          </div>

          {/* Bottom row: Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              >
                <option value="all">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'all' | JournalEntryStatus)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
                placeholder="Start date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
                placeholder="End date"
              />
            </div>

            {(filterStatus !== 'all' ||
              filterCompany !== 'all' ||
              searchTerm ||
              startDate ||
              endDate) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterCompany('all');
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-sm text-[#5A7A8F] hover:text-[#2c3e50] font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable<JournalEntry>
            columns={columns}
            data={sortedEntries}
            emptyMessage="No journal entries found. Create your first entry to get started."
          />
        </div>

        {/* Modal */}
        <JournalEntryFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          editingEntry={editingEntry}
        />
      </div>
    </AppShell>
  );
}
