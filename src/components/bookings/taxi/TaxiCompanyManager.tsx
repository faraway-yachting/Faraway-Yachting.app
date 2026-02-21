'use client';

import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Link2, Copy, Check } from 'lucide-react';
import { TaxiCompany, TaxiPublicLink } from '@/data/taxi/types';
import { taxiCompaniesApi } from '@/lib/supabase/api/taxiCompanies';
import { taxiPublicLinksApi } from '@/lib/supabase/api/taxiPublicLinks';
import { useAllTaxiCompanies } from '@/hooks/queries/useTaxiTransfers';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TaxiCompanyManagerProps {
  onClose: () => void;
}

export function TaxiCompanyManager({ onClose }: TaxiCompanyManagerProps) {
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading } = useAllTaxiCompanies();
  const { data: allLinks = [] } = useQuery({
    queryKey: ['taxiPublicLinks'],
    queryFn: () => taxiPublicLinksApi.getAll(),
    staleTime: 60 * 1000,
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setLineId('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (company: TaxiCompany) => {
    setEditingId(company.id);
    setName(company.name);
    setContactPerson(company.contactPerson || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setLineId(company.lineId || '');
    setNotes(company.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await taxiCompaniesApi.update(editingId, { name, contactPerson, phone, email, lineId, notes });
      } else {
        await taxiCompaniesApi.create({ name, contactPerson, phone, email, lineId, notes });
      }
      queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this taxi company? This will unlink all transfers.')) return;
    await taxiCompaniesApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
  };

  const handleToggleActive = async (company: TaxiCompany) => {
    await taxiCompaniesApi.update(company.id, { isActive: !company.isActive });
    queryClient.invalidateQueries({ queryKey: ['taxiCompanies'] });
  };

  const handleGenerateLink = async (company: TaxiCompany) => {
    await taxiPublicLinksApi.create({
      label: company.name,
      taxiCompanyId: company.id,
    });
    queryClient.invalidateQueries({ queryKey: ['taxiPublicLinks'] });
  };

  const handleCopyLink = (link: TaxiPublicLink) => {
    const url = `${window.location.origin}/public/taxi/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    await taxiPublicLinksApi.delete(linkId);
    queryClient.invalidateQueries({ queryKey: ['taxiPublicLinks'] });
  };

  const getCompanyLinks = (companyId: string) =>
    allLinks.filter(l => l.taxiCompanyId === companyId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Taxi Companies</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add button */}
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Add Company
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {editingId ? 'Edit Company' : 'New Company'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Company list */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : companies.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No taxi companies yet</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => {
                const links = getCompanyLinks(company.id);
                return (
                  <div key={company.id} className={`border rounded-lg p-4 ${company.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{company.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                          {company.contactPerson && <span>{company.contactPerson}</span>}
                          {company.phone && <span>{company.phone}</span>}
                          {company.email && <span>{company.email}</span>}
                          {company.lineId && <span>LINE: {company.lineId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(company)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(company)}
                          className={`px-2 py-1 text-xs rounded ${company.isActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Public links */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">Public Schedule Link</span>
                        {links.length === 0 && (
                          <button
                            onClick={() => handleGenerateLink(company)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Link2 className="h-3 w-3" />
                            Generate Link
                          </button>
                        )}
                      </div>
                      {links.map(link => (
                        <div key={link.id} className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded truncate">
                            {window.location.origin}/public/taxi/{link.token}
                          </code>
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Copy link"
                          >
                            {copiedLinkId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete link"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
