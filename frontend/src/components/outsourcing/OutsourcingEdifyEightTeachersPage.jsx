import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { useEdifyEightTeacherPermissions } from '../../hooks/usePermissions';
import { OutsourcingPageHeader } from '../../features/outsourcing/components/OutsourcingUI';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  subject: '',
  status: 'active',
};

const unwrapItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.teachers)) return payload.teachers;
  return [];
};

const getTeacherId = (teacher = {}) => String(teacher._id || teacher.id || teacher.teacherId || teacher.email || '');

const getTeacherName = (teacher = {}) =>
  teacher.name ||
  teacher.fullName ||
  [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') ||
  'Teacher';

const normalizeTeacherForForm = (teacher = {}) => ({
  name: getTeacherName(teacher) === 'Teacher' ? '' : getTeacherName(teacher),
  email: teacher.email || '',
  phone: teacher.phone || teacher.mobile || '',
  password: '',
  subject: teacher.subject || teacher.specialization || '',
  status: teacher.status || (teacher.isActive === false ? 'inactive' : 'active'),
});

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</span>
    {children}
  </label>
);

const inputClass =
  'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white';

export default function OutsourcingEdifyEightTeachersPage() {
  const { token, user } = useAuth();
  const permissions = useEdifyEightTeacherPermissions(user);
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [modalMode, setModalMode] = useState('');

  const loadTeachers = useCallback(async () => {
    if (!token || !permissions.canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await outsourcingApi.getEdifyEightTeachers(token, { limit: 100 });
      setTeachers(unwrapItems(response));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load EdifyEight teachers');
    } finally {
      setLoading(false);
    }
  }, [token, permissions.canRead]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return teachers;
    return teachers.filter((teacher) =>
      [getTeacherName(teacher), teacher.email, teacher.phone, teacher.mobile, teacher.subject, teacher.specialization, teacher.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [teachers, query]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingTeacher(null);
    setModalMode('create');
  };

  const openEdit = (teacher) => {
    setForm(normalizeTeacherForForm(teacher));
    setEditingTeacher(teacher);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('');
    setEditingTeacher(null);
    setForm(emptyForm);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (modalMode === 'edit' || !payload.password) {
        delete payload.password;
      }
      if (modalMode === 'edit') {
        await outsourcingApi.updateEdifyEightTeacher(token, getTeacherId(editingTeacher), payload);
      } else {
        await outsourcingApi.createEdifyEightTeacher(token, payload);
      }
      closeModal();
      await loadTeachers();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTeacher) return;
    setSaving(true);
    setError('');
    try {
      await outsourcingApi.deleteEdifyEightTeacher(token, getTeacherId(deletingTeacher));
      setDeletingTeacher(null);
      await loadTeachers();
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete teacher');
    } finally {
      setSaving(false);
    }
  };

  if (!permissions.canRead) {
    return (
      <div className="space-y-4">
        <OutsourcingPageHeader
          title="EdifyEight Teachers"
          subtitle="Teacher records from EdifyEight through the Super Admin API gateway."
          icon="school"
          accent="#10b981"
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          You do not have permission to view EdifyEight teachers.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OutsourcingPageHeader
        title="EdifyEight Teachers"
        subtitle="Manage Project B teacher records without leaving the Super Admin Portal."
        icon="school"
        accent="#10b981"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTeachers}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
            {permissions.canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Teacher
              </button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-neutral-950 dark:text-white">Teacher records</h2>
            <p className="text-xs text-neutral-500">{filteredTeachers.length} visible records</p>
          </div>
          <label className="relative block md:w-80">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, subject"
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                  <th className="py-3 pr-4">Teacher</th>
                  <th className="py-3 pr-4">Contact</th>
                  <th className="py-3 pr-4">Subject</th>
                  <th className="py-3 pr-4">Status</th>
                  {(permissions.canUpdate || permissions.canDelete) ? <th className="py-3 pr-4 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={getTeacherId(teacher)} className="border-b border-neutral-100 align-top dark:border-neutral-800">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-neutral-950 dark:text-white">{getTeacherName(teacher)}</p>
                      <p className="text-xs text-neutral-500">{teacher.teacherId || teacher._id || teacher.id || '-'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-neutral-800 dark:text-neutral-100">{teacher.email || '-'}</p>
                      <p className="text-xs text-neutral-500">{teacher.phone || teacher.mobile || '-'}</p>
                    </td>
                    <td className="py-3 pr-4">{teacher.subject || teacher.specialization || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${teacher.isActive === false || teacher.status === 'inactive' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                        {teacher.status || (teacher.isActive === false ? 'inactive' : 'active')}
                      </span>
                    </td>
                    {(permissions.canUpdate || permissions.canDelete) ? (
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          {permissions.canUpdate ? (
                            <button
                              type="button"
                              onClick={() => openEdit(teacher)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                              title="Edit teacher"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          ) : null}
                          {permissions.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeletingTeacher(teacher)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                              title="Delete teacher"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTeachers.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-neutral-500">No EdifyEight teachers found.</p>
            ) : null}
          </div>
        )}
      </section>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closeModal}>
          <form className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900" onSubmit={submitForm} onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-neutral-950 dark:text-white">{modalMode === 'edit' ? 'Edit Teacher' : 'Add Teacher'}</h3>
              <button type="button" onClick={closeModal} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="grid gap-3">
              <Field label="Name">
                <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </Field>
              {modalMode === 'create' ? (
                <Field label="Password">
                  <input
                    className={inputClass}
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Optional"
                  />
                </Field>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone">
                  <input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </Field>
                <Field label="Subject">
                  <input className={inputClass} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                </Field>
              </div>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Teacher'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDeletingTeacher(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-black text-neutral-950 dark:text-white">Delete Teacher</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Delete {getTeacherName(deletingTeacher)} from EdifyEight?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingTeacher(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
