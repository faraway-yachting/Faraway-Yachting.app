'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, Trash2, FileText, AlertTriangle, Upload, Download, Share2, Eye, Pencil, X, Check } from 'lucide-react';
import { employeeDocumentsApi } from '@/lib/supabase/api/employeeDocuments';
import { hrDocumentTypesApi } from '@/lib/supabase/api/hrDocumentTypes';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type EmployeeDocument = Database['public']['Tables']['employee_documents']['Row'];
type HRDocumentType = Database['public']['Tables']['hr_document_types']['Row'];

interface DocumentsManagerProps {
  employeeId: string;
  editing?: boolean;
}

export default function DocumentsManager({ employeeId, editing = false }: DocumentsManagerProps) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [docTypes, setDocTypes] = useState<HRDocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    document_type: '',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    alert_days_before: '30',
    notes: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    document_type: '',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    alert_days_before: '30',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsData, types] = await Promise.all([
        employeeDocumentsApi.getByEmployee(employeeId),
        hrDocumentTypesApi.getActive(),
      ]);
      setDocs(docsData);
      setDocTypes(types);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({
      document_type: docTypes[0]?.name || '',
      document_name: '',
      issue_date: '',
      expiry_date: '',
      alert_days_before: '30',
      notes: '',
    });
    setSelectedFiles([]);
    setShowForm(false);
  };

  const uploadFiles = async (docId: string): Promise<{ file_url: string; file_name: string } | null> => {
    if (selectedFiles.length === 0) return null;
    const supabase = createClient();
    const uploadedUrls: string[] = [];
    const uploadedNames: string[] = [];

    for (const file of selectedFiles) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `employees/${employeeId}/docs/${docId}/${timestamp}_${safeName}`;
      const { error } = await supabase.storage
        .from('hr-files')
        .upload(path, file, { upsert: true });
      if (error) {
        console.error('Failed to upload file:', error);
        continue;
      }
      const { data: urlData } = supabase.storage.from('hr-files').getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
      uploadedNames.push(file.name);
    }

    if (uploadedUrls.length === 0) return null;
    return {
      file_url: uploadedUrls.join('||'),
      file_name: uploadedNames.join('||'),
    };
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const created = await hrDocumentTypesApi.create({
        name: newTypeName.trim(),
        sort_order: docTypes.length + 1,
      });
      setDocTypes((prev) => [...prev, created]);
      setForm((f) => ({ ...f, document_type: created.name }));
      setNewTypeName('');
      setShowAddType(false);
    } catch (error) {
      console.error('Failed to add document type:', error);
      alert('Failed to add type. It may already exist.');
    } finally {
      setAddingType(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await employeeDocumentsApi.create({
        employee_id: employeeId,
        document_type: form.document_type,
        document_name: form.document_name.trim() || form.document_type,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        alert_days_before: parseInt(form.alert_days_before) || 30,
        notes: form.notes.trim() || null,
      });
      const fileData = await uploadFiles(created.id);
      if (fileData) {
        await employeeDocumentsApi.update(created.id, fileData);
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Failed to add document:', error);
      alert('Failed to add document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (!confirm('Delete this document record and its files?')) return;
    try {
      if (doc.file_url) {
        const supabase = createClient();
        const urls = doc.file_url.split('||');
        for (const url of urls) {
          const match = url.trim().match(/hr-files\/(.+)$/);
          if (match) {
            await supabase.storage.from('hr-files').remove([decodeURIComponent(match[1])]);
          }
        }
      }
      await employeeDocumentsApi.delete(doc.id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const startEdit = (doc: EmployeeDocument) => {
    setEditingId(doc.id);
    setViewingId(null);
    setEditForm({
      document_type: doc.document_type || '',
      document_name: doc.document_name || '',
      issue_date: doc.issue_date || '',
      expiry_date: doc.expiry_date || '',
      alert_days_before: String(doc.alert_days_before ?? 30),
      notes: doc.notes || '',
    });
    setEditFiles([]);
  };

  const handleUpdate = async (doc: EmployeeDocument) => {
    setEditSaving(true);
    try {
      const updates: Record<string, unknown> = {
        document_type: editForm.document_type,
        document_name: editForm.document_name.trim() || editForm.document_type,
        issue_date: editForm.issue_date || null,
        expiry_date: editForm.expiry_date || null,
        alert_days_before: parseInt(editForm.alert_days_before) || 30,
        notes: editForm.notes.trim() || null,
      };

      // Upload new files if any
      if (editFiles.length > 0) {
        const supabase = createClient();
        const existingUrls = doc.file_url ? doc.file_url.split('||') : [];
        const existingNames = doc.file_name ? doc.file_name.split('||') : [];
        const newUrls = [...existingUrls];
        const newNames = [...existingNames];

        for (const file of editFiles) {
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `employees/${employeeId}/docs/${doc.id}/${timestamp}_${safeName}`;
          const { error } = await supabase.storage
            .from('hr-files')
            .upload(path, file, { upsert: true });
          if (error) {
            console.error('Failed to upload file:', error);
            continue;
          }
          const { data: urlData } = supabase.storage.from('hr-files').getPublicUrl(path);
          newUrls.push(urlData.publicUrl);
          newNames.push(file.name);
        }

        updates.file_url = newUrls.join('||');
        updates.file_name = newNames.join('||');
      }

      await employeeDocumentsApi.update(doc.id, updates);
      setEditingId(null);
      setEditFiles([]);
      await loadData();
    } catch (error) {
      console.error('Failed to update document:', error);
      alert('Failed to update document.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleRemoveFile = async (doc: EmployeeDocument, fileIndex: number) => {
    if (!confirm('Remove this file?')) return;
    try {
      const urls = doc.file_url ? doc.file_url.split('||') : [];
      const names = doc.file_name ? doc.file_name.split('||') : [];
      const removedUrl = urls[fileIndex];

      // Remove from storage
      if (removedUrl) {
        const supabase = createClient();
        const match = removedUrl.trim().match(/hr-files\/(.+)$/);
        if (match) {
          await supabase.storage.from('hr-files').remove([decodeURIComponent(match[1])]);
        }
      }

      urls.splice(fileIndex, 1);
      names.splice(fileIndex, 1);

      await employeeDocumentsApi.update(doc.id, {
        file_url: urls.join('||') || null,
        file_name: names.join('||') || null,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to remove file:', error);
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getFileLinks = (doc: EmployeeDocument) => {
    if (!doc.file_url) return [];
    const urls = doc.file_url.split('||');
    const names = doc.file_name ? doc.file_name.split('||') : [];
    return urls.map((url, i) => ({
      url: url.trim(),
      name: names[i]?.trim() || `File ${i + 1}`,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
        {editing && (
          <button
            onClick={() => { setShowForm(!showForm); if (!form.document_type && docTypes.length) setForm((f) => ({ ...f, document_type: docTypes[0].name })); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <div className="flex gap-2">
                <select
                  value={form.document_type}
                  onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                >
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.name}>{dt.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddType(!showAddType)}
                  className="p-2 text-[#5A7A8F] border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  title="Add new type"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showAddType && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="New type name..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddType(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    disabled={addingType || !newTypeName.trim()}
                    className="px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
                  >
                    {addingType ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name / Description</label>
              <input
                value={form.document_name}
                onChange={(e) => setForm((f) => ({ ...f, document_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                placeholder="e.g. Thai ID Card"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alert Days Before Expiry</label>
              <input
                type="number"
                value={form.alert_days_before}
                onChange={(e) => setForm((f) => ({ ...f, alert_days_before: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Attachments</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 text-sm border border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-[#5A7A8F] hover:bg-white transition-colors flex items-center gap-2 text-gray-500"
              >
                <Upload className="h-4 w-4" />
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                  : 'Click to upload files...'
                }
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="hidden"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {f.name}
                      <span className="text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No documents added yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const daysLeft = getDaysUntilExpiry(doc.expiry_date);
            const isExpired = daysLeft !== null && daysLeft < 0;
            const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= (doc.alert_days_before || 30);
            const files = getFileLinks(doc);
            const isEditing = editingId === doc.id;
            const isViewing = viewingId === doc.id;

            if (isEditing) {
              return (
                <div key={doc.id} className="bg-gray-50 border border-[#5A7A8F] rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={editForm.document_type}
                        onChange={(e) => setEditForm((f) => ({ ...f, document_type: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                      >
                        {docTypes.map((dt) => (
                          <option key={dt.id} value={dt.name}>{dt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name / Description</label>
                      <input
                        value={editForm.document_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, document_name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={editForm.issue_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, issue_date: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={editForm.expiry_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, expiry_date: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Alert Days Before Expiry</label>
                      <input
                        type="number"
                        value={editForm.alert_days_before}
                        onChange={(e) => setEditForm((f) => ({ ...f, alert_days_before: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Add More Files</label>
                      <div
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full px-3 py-2 text-sm border border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-[#5A7A8F] hover:bg-white transition-colors flex items-center gap-2 text-gray-500"
                      >
                        <Upload className="h-4 w-4" />
                        {editFiles.length > 0
                          ? `${editFiles.length} new file${editFiles.length > 1 ? 's' : ''} selected`
                          : 'Click to upload more files...'
                        }
                      </div>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => setEditFiles(Array.from(e.target.files || []))}
                        className="hidden"
                      />
                    </div>
                  </div>
                  {/* Existing files with remove option */}
                  {files.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Current Files</label>
                      <div className="space-y-1">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="flex-1 text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(doc, i)}
                              className="text-red-400 hover:text-red-600"
                              title="Remove file"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(doc)}
                      disabled={editSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
                    >
                      {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {doc.document_type}
                        {doc.document_name && doc.document_name !== doc.document_type && (
                          <span className="text-gray-500 font-normal ml-1">- {doc.document_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {doc.issue_date && <span>Issued: {doc.issue_date}</span>}
                        {doc.expiry_date && <span className="ml-3">Expires: {doc.expiry_date}</span>}
                      </div>
                      {/* Expandable detail view */}
                      {isViewing && (
                        <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-3 text-xs">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span className="text-gray-500">Type:</span> <span className="text-gray-700">{doc.document_type}</span></div>
                            <div><span className="text-gray-500">Name:</span> <span className="text-gray-700">{doc.document_name || '-'}</span></div>
                            <div><span className="text-gray-500">Issue Date:</span> <span className="text-gray-700">{doc.issue_date || '-'}</span></div>
                            <div><span className="text-gray-500">Expiry Date:</span> <span className="text-gray-700">{doc.expiry_date || '-'}</span></div>
                            <div><span className="text-gray-500">Alert:</span> <span className="text-gray-700">{doc.alert_days_before || 30} days before expiry</span></div>
                          </div>
                          {doc.notes && <div><span className="text-gray-500">Notes:</span> <span className="text-gray-700">{doc.notes}</span></div>}
                        </div>
                      )}
                      {/* File attachments with download & share */}
                      {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {files.map((file, i) => (
                            <div key={i} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">
                              <FileText className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-700 max-w-[120px] truncate">{file.name}</span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-[#5A7A8F] hover:text-[#4a6a7f] transition-colors"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                              <button
                                onClick={() => handleShare(file.url)}
                                className="p-0.5 text-[#5A7A8F] hover:text-[#4a6a7f] transition-colors"
                                title="Share link"
                              >
                                <Share2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isViewing && doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(isExpired || isExpiring) && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <AlertTriangle className="h-3 w-3" />
                        {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `${daysLeft}d left`}
                      </span>
                    )}
                    <button
                      onClick={() => setViewingId(isViewing ? null : doc.id)}
                      className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                      title={isViewing ? 'Close details' : 'View details'}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {editing && (
                      <>
                        <button
                          onClick={() => startEdit(doc)}
                          className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(doc)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
