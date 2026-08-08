import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { useEdifyEightStudyMaterialPermissions } from '../../hooks/usePermissions';
import { OutsourcingPageHeader } from '../../features/outsourcing/components/OutsourcingUI';

const fallbackMeta = {
  classes: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
  boards: ['CBSE', 'ICSE', 'State Board', 'ISC'],
  subjects: ['Maths', 'Science', 'English'],
  categories: ['Notes', 'Reference Books', 'Practice Papers', 'Video Content', 'Syllabus', 'Other'],
  accessLevels: ['free', 'limited', 'premium'],
};

const emptyForm = {
  title: '',
  class: '',
  board: 'CBSE',
  subject: 'Maths',
  category: 'Notes',
  accessLevel: 'free',
  price: 0,
};

const ITEMS_PER_PAGE = 6;

const unwrapItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.materials)) return payload.materials;
  return [];
};

const unwrapMetadata = (payload) => payload?.data || payload || {};
const getName = (item) => (typeof item === 'string' ? item : item?.name || '');
const getMaterialId = (material = {}) => String(material._id || material.id || '');

const inputClass =
  'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</span>
    {children}
  </label>
);

const getInlinePdfUrl = (url) => {
  if (!url) return '';
  return String(url).replace('/raw/upload/', '/raw/upload/fl_attachment:false/');
};

export default function OutsourcingEdifyEightStudyMaterialsPage() {
  const { token, user } = useAuth();
  const permissions = useEdifyEightStudyMaterialPermissions(user);
  const [materials, setMaterials] = useState([]);
  const [metadata, setMetadata] = useState(fallbackMeta);
  const [query, setQuery] = useState('');
  const [filterAccess, setFilterAccess] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [pdf, setPdf] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const loadMetadata = useCallback(async () => {
    if (!token || !permissions.canRead) return;
    try {
      const response = await outsourcingApi.getEdifyEightStudyMaterialMetadata(token);
      const next = unwrapMetadata(response);
      setMetadata({
        classes: next.classes?.length ? next.classes.map(getName).filter(Boolean) : fallbackMeta.classes,
        boards: next.boards?.length ? next.boards.map(getName).filter(Boolean) : fallbackMeta.boards,
        subjects: next.subjects?.length ? next.subjects : fallbackMeta.subjects,
        categories: next.categories?.length ? next.categories : fallbackMeta.categories,
        accessLevels: next.accessLevels?.length ? next.accessLevels : fallbackMeta.accessLevels,
      });
    } catch {
      setMetadata(fallbackMeta);
    }
  }, [token, permissions.canRead]);

  const loadMaterials = useCallback(async () => {
    if (!token || !permissions.canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await outsourcingApi.getEdifyEightStudyMaterials(token);
      setMaterials(unwrapItems(response));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load EdifyEight study materials');
    } finally {
      setLoading(false);
    }
  }, [token, permissions.canRead]);

  useEffect(() => {
    loadMetadata();
    loadMaterials();
  }, [loadMetadata, loadMaterials]);

  const stats = useMemo(
    () => ({
      total: materials.length,
      free: materials.filter((material) => material.isFree || material.accessLevel === 'free').length,
      paid: materials.filter((material) => !(material.isFree || material.accessLevel === 'free')).length,
    }),
    [materials]
  );

  const visibleMaterials = useMemo(() => {
    const search = query.trim().toLowerCase();
    return materials.filter((material) => {
      const accessLevel = material.accessLevel || (material.isFree ? 'free' : 'premium');
      const matchesAccess = filterAccess === 'all' || accessLevel === filterAccess;
      const matchesSearch =
        !search ||
        [material.title, material.class, material.board, material.subject, material.category, accessLevel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesAccess && matchesSearch;
    });
  }, [materials, query, filterAccess]);

  const totalPages = Math.max(1, Math.ceil(visibleMaterials.length / ITEMS_PER_PAGE));
  const paginatedMaterials = visibleMaterials.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterAccess]);

  const setField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'accessLevel' && value === 'free') next.price = 0;
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPdf(null);
    setEditingMaterial(null);
  };

  const editMaterial = (material) => {
    setEditingMaterial(material);
    setForm({
      title: material.title || '',
      class: material.class || '',
      board: material.board || metadata.boards[0] || 'CBSE',
      subject: material.subject || metadata.subjects[0] || 'Maths',
      category: material.category || 'Notes',
      accessLevel: material.accessLevel || (material.isFree ? 'free' : 'premium'),
      price: material.price || 0,
    });
    setPdf(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!editingMaterial && !pdf) {
      setError('PDF file is required');
      return;
    }
    if (pdf && pdf.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append('isFree', String(form.accessLevel === 'free'));
    if (pdf) formData.append('pdf', pdf);

    setSaving(true);
    setError('');
    try {
      if (editingMaterial) {
        await outsourcingApi.updateEdifyEightStudyMaterial(token, getMaterialId(editingMaterial), formData);
      } else {
        await outsourcingApi.createEdifyEightStudyMaterial(token, formData);
      }
      resetForm();
      await loadMaterials();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save study material');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingMaterial) return;
    setSaving(true);
    setError('');
    try {
      await outsourcingApi.deleteEdifyEightStudyMaterial(token, getMaterialId(deletingMaterial));
      setDeletingMaterial(null);
      await loadMaterials();
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete study material');
    } finally {
      setSaving(false);
    }
  };

  if (!permissions.canRead) {
    return (
      <div className="space-y-4">
        <OutsourcingPageHeader title="Study Materials" subtitle="EdifyEight material access is not available for this user." icon="article" accent="#0ea5e9" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OutsourcingPageHeader
        title="Study Materials"
        subtitle="Upload, edit and manage EdifyEight study materials from the Super Admin Portal."
        icon="article"
        accent="#0ea5e9"
        action={
          <button type="button" onClick={loadMaterials} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['Total Materials', stats.total, 'article', 'bg-sky-600'],
          ['Free Materials', stats.free, 'lock_open', 'bg-emerald-600'],
          ['Paid Materials', stats.paid, 'workspace_premium', 'bg-amber-500'],
        ].map(([label, value, icon, color]) => (
          <div key={label} className={`${color} rounded-lg p-4 text-white shadow-sm`}>
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="text-sm font-semibold text-white/85">{label}</p>
          </div>
        ))}
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{error}</div> : null}

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-neutral-950 dark:text-white">
          <span className="material-symbols-outlined rounded-lg bg-sky-600 p-2 text-white">upload</span>
          {editingMaterial ? 'Edit Study Material' : 'Upload Study Material'}
        </h2>
        <form onSubmit={submitForm} className="grid gap-4">
          <Field label="Material Title">
            <input className={inputClass} value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Algebra - Chapter 1 Notes" required />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Class">
              <select className={inputClass} value={form.class} onChange={(event) => setField('class', event.target.value)} required>
                <option value="">Select Class</option>
                {metadata.classes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Board">
              <select className={inputClass} value={form.board} onChange={(event) => setField('board', event.target.value)} required>
                {metadata.boards.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <select className={inputClass} value={form.subject} onChange={(event) => setField('subject', event.target.value)} required>
                {metadata.subjects.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Material Category">
              <select className={inputClass} value={form.category} onChange={(event) => setField('category', event.target.value)} required>
                {metadata.categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Access Level">
              <select className={inputClass} value={form.accessLevel} onChange={(event) => setField('accessLevel', event.target.value)}>
                {metadata.accessLevels.map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Price">
              <input className={inputClass} type="number" min="0" value={form.price} disabled={form.accessLevel === 'free'} onChange={(event) => setField('price', event.target.value)} />
            </Field>
          </div>
          {editingMaterial?.pdfUrl ? (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Current PDF Preview</p>
                <a className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 dark:text-sky-300" href={editingMaterial.pdfUrl} target="_blank" rel="noreferrer">
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Open
                </a>
              </div>
              <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(getInlinePdfUrl(editingMaterial.pdfUrl))}&embedded=true`} className="h-72 w-full bg-white" title="Current PDF Preview" />
            </div>
          ) : null}
          <Field label={editingMaterial ? 'Replace PDF' : 'PDF File'}>
            <input className="block w-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200" type="file" accept="application/pdf" onChange={(event) => setPdf(event.target.files?.[0] || null)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || (!permissions.canCreate && !editingMaterial) || (!permissions.canUpdate && editingMaterial)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">{saving ? 'hourglass_top' : 'save'}</span>
              {saving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Upload Material'}
            </button>
            {editingMaterial ? <button type="button" onClick={resetForm} className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button> : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-neutral-950 dark:text-white">Uploaded materials</h2>
            <p className="text-xs text-neutral-500">{visibleMaterials.length} visible records</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className={inputClass} value={filterAccess} onChange={(event) => setFilterAccess(event.target.value)}>
              <option value="all">All access levels</option>
              {metadata.accessLevels.map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}
            </select>
            <input className={`${inputClass} sm:w-80`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedMaterials.map((material) => {
                const isFree = material.isFree || material.accessLevel === 'free';
                return (
                  <article key={getMaterialId(material)} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-neutral-950 dark:text-white">{material.title}</h3>
                        <p className="mt-1 text-sm text-neutral-500">{material.class} / {material.board} / {material.subject}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isFree ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                        {isFree ? 'FREE' : `INR ${material.price || 0}`}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{material.category || 'Notes'}</p>
                    <p className="mt-1 text-xs text-neutral-400">{material.createdBy?.name || material.createdBy?.email ? `Uploaded by ${material.createdBy?.name || material.createdBy?.email}` : 'Uploaded through EdifyEight'}</p>
                    <div className="mt-4 flex justify-end gap-2">
                      {material.pdfUrl ? (
                        <a href={material.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Open PDF">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                      ) : null}
                      {permissions.canUpdate ? (
                        <button type="button" onClick={() => editMaterial(material)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Edit material">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      ) : null}
                      {permissions.canDelete ? (
                        <button type="button" onClick={() => setDeletingMaterial(material)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30" title="Delete material">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {visibleMaterials.length === 0 ? <p className="col-span-full py-8 text-center text-sm font-semibold text-neutral-500">No EdifyEight study materials found.</p> : null}
            </div>

            {visibleMaterials.length > ITEMS_PER_PAGE ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold ${currentPage === page ? 'bg-sky-600 text-white' : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800'}`}>
                    {page}
                  </button>
                ))}
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {deletingMaterial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDeletingMaterial(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-black text-neutral-950 dark:text-white">Delete Study Material</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Delete {deletingMaterial.title || 'this study material'} permanently?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingMaterial(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
