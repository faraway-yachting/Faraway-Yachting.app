'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Search, X, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { bookingAgenciesApi, AgencyWithContact } from '@/lib/supabase/api/bookingAgencies';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { DynamicSelect } from '@/components/bookings/form/DynamicSelect';

interface AgencyForm {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  platform: string;
  commissionRate: string;
  defaultCurrency: string;
  contractFilename: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: AgencyForm = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  platform: '',
  commissionRate: '',
  defaultCurrency: '',
  contractFilename: '',
  notes: '',
  isActive: true,
};

export default function AgenciesPage() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canEdit = isSuperAdmin || hasPermission('bookings.agencies.edit');

  const [agencies, setAgencies] = useState<AgencyWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAgencies = useCallback(async () => {
    try {
      const data = await bookingAgenciesApi.getAll();
      setAgencies(data);

      // Auto-sync: find agency contacts without booking_agencies records
      const agencyContacts = await contactsApi.getAgencies();
      const linkedContactIds = new Set(data.map((a: AgencyWithContact) => a.contact_id));
      const unlinked = agencyContacts.filter((c: { id: string }) => !linkedContactIds.has(c.id));

      if (unlinked.length > 0) {
        for (const contact of unlinked) {
          await bookingAgenciesApi.create({
            contact_id: contact.id,
            is_active: true,
          });
        }
        const updated = await bookingAgenciesApi.getAll();
        setAgencies(updated);
      }
    } catch (err) {
      console.error('Failed to load agencies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const filtered = agencies.filter((a) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = a.contact?.name?.toLowerCase() ?? '';
    const person = a.contact?.contact_person?.toLowerCase() ?? '';
    const platform = (a.platform ?? '').toLowerCase();
    return name.includes(q) || person.includes(q) || platform.includes(q);
  });

  function openAdd() {
    setEditingId(null);
    setEditingContactId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(agency: AgencyWithContact) {
    setEditingId(agency.id);
    setEditingContactId(agency.contact_id);
    setForm({
      companyName: agency.contact?.name ?? '',
      contactPerson: agency.contact?.contact_person ?? '',
      email: agency.contact?.email ?? '',
      phone: agency.contact?.phone ?? '',
      platform: agency.platform ?? '',
      commissionRate: agency.commission_rate != null ? String(agency.commission_rate) : '',
      defaultCurrency: agency.default_currency ?? '',
      contractFilename: agency.contract_filename ?? '',
      notes: agency.notes ?? '',
      isActive: agency.is_active ?? true,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      if (editingId && editingContactId) {
        // Update contact
        await contactsApi.update(editingContactId, {
          name: form.companyName.trim(),
          contact_person: form.contactPerson || null,
          email: form.email || null,
          phone: form.phone || null,
        });
        // Update agency
        await bookingAgenciesApi.update(editingId, {
          platform: form.platform || null,
          commission_rate: form.commissionRate ? parseFloat(form.commissionRate) : null,
          default_currency: form.defaultCurrency || 'THB',
          contract_filename: form.contractFilename || null,
          notes: form.notes || null,
          is_active: form.isActive,
        });
      } else {
        // Create contact first
        const contact = await contactsApi.create({
          name: form.companyName.trim(),
          type: ['agency'],
          contact_person: form.contactPerson || null,
          email: form.email || null,
          phone: form.phone || null,
          is_active: true,
        });
        // Create agency
        await bookingAgenciesApi.create({
          contact_id: contact.id,
          platform: form.platform || null,
          commission_rate: form.commissionRate ? parseFloat(form.commissionRate) : null,
          default_currency: form.defaultCurrency || 'THB',
          contract_filename: form.contractFilename || null,
          notes: form.notes || null,
          is_active: form.isActive,
        });
      }
      setModalOpen(false);
      await loadAgencies();
    } catch (err) {
      console.error('Failed to save agency:', err);
      alert('Failed to save agency. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(agency: AgencyWithContact) {
    if (!confirm(`Delete agency "${agency.contact?.name ?? 'Unknown'}"? This cannot be undone.`)) return;
    try {
      await bookingAgenciesApi.delete(agency.id);
      await loadAgencies();
    } catch (err) {
      console.error('Failed to delete agency:', err);
      alert('Failed to delete agency.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((f) => ({ ...f, contractFilename: file.name }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-[#5A7A8F]" />
          <h1 className="text-2xl font-bold text-gray-900">Agencies</h1>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Agency
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact person, or platform..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact Person</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commission %</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {canEdit && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No agencies found
                  </td>
                </tr>
              ) : (
                filtered.map((agency) => (
                  <tr key={agency.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{agency.contact?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{agency.contact?.contact_person ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{agency.platform ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {agency.commission_rate != null ? `${agency.commission_rate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{agency.contact?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{agency.contact?.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          agency.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(agency)}
                            className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(agency)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Agency' : 'Add Agency'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                  placeholder="Agency company name"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                  placeholder="Primary contact name"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <DynamicSelect
                  category="agent_platform"
                  value={form.platform}
                  onChange={(v) => setForm((f) => ({ ...f, platform: v }))}
                  placeholder="Select platform..."
                />
              </div>

              {/* Commission & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commissionRate}
                    onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                    placeholder="e.g. 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                  <DynamicSelect
                    category="currency"
                    value={form.defaultCurrency}
                    onChange={(v) => setForm((f) => ({ ...f, defaultCurrency: v }))}
                    placeholder="Select currency..."
                  />
                </div>
              </div>

              {/* Contract Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#5A7A8F]/10 file:text-[#5A7A8F] hover:file:bg-[#5A7A8F]/20 file:cursor-pointer"
                  />
                </div>
                {form.contractFilename && (
                  <p className="mt-1 text-xs text-gray-500">File: {form.contractFilename}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Active</label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? 'bg-[#5A7A8F]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.companyName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Agency'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
