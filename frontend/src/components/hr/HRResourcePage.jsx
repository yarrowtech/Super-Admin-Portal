import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import hrResourceConfig from './hrResourceConfig';

const getValue = (item, path) => {
  if (!path) return '';
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), item);
};

const normalizeInputValue = (value, type) => {
  if (type === 'checkbox') return !!value;
  if (type === 'number') return value === '' ? '' : Number(value);
  return value;
};

const serializeFieldValue = (value, type) => {
  if (type === 'number') return value === '' ? undefined : Number(value);
  if (type === 'checkbox') return !!value;
  if (type === 'list') {
    if (!value) return undefined;
    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (type === 'json') {
    if (!value) return undefined;
    return JSON.parse(value);
  }
  return value === '' ? undefined : value;
};

const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const HRResourcePage = () => {
  const { key } = useParams();
  const resource = hrResourceConfig[key];
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const title = resource?.title || 'Resource';
  const description = resource?.description || '';

  const visibleFields = useMemo(() => {
    if (!resource?.formFields) return [];
    return resource.formFields.filter((field) => !(editingId && field.hideOnEdit));
  }, [resource, editingId]);

  const fetchItems = async () => {
    if (!resource?.endpoint) return;
    setLoading(true);
    setAlert(null);
    try {
      const res = await apiClient.get(resource.endpoint, token);
      const data =
        res?.data?.tickets ||
        res?.data?.items ||
        res?.data?.records ||
        res?.data?.documents ||
        res?.data?.data ||
        res?.data ||
        res;
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setFormData({});
    setEditingId(null);
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handleChange = (name, value, type) => {
    setFormData((prev) => ({
      ...prev,
      [name]: normalizeInputValue(value, type)
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    const nextData = {};
    (resource?.formFields || []).forEach((field) => {
      const rawValue = item[field.name];
      if (field.type === 'json' && rawValue) {
        nextData[field.name] = JSON.stringify(rawValue);
      } else if (field.type === 'checkbox') {
        nextData[field.name] = !!rawValue;
      } else {
        nextData[field.name] = rawValue ?? '';
      }
    });
    setFormData(nextData);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!resource?.endpoint) return;
    setAlert(null);

    try {
      const payload = {};
      visibleFields.forEach((field) => {
        if (editingId && field.name === 'password' && !formData[field.name]) {
          return;
        }
        const value = serializeFieldValue(formData[field.name], field.type);
        if (value !== undefined) {
          payload[field.name] = value;
        }
      });

      if (editingId) {
        await apiClient.put(`${resource.endpoint}/${editingId}`, payload, token);
        setAlert({ type: 'success', message: 'Record updated successfully.' });
      } else {
        await apiClient.post(resource.endpoint, payload, token);
        setAlert({ type: 'success', message: 'Record created successfully.' });
      }
      resetForm();
      fetchItems();
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to save changes' });
    }
  };

  const handleDelete = async (id) => {
    if (!resource?.endpoint || !resource?.allowDelete) return;
    setAlert(null);
    try {
      await apiClient.delete(`${resource.endpoint}/${id}`, token);
      setAlert({ type: 'success', message: 'Record deleted successfully.' });
      fetchItems();
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to delete item' });
    }
  };

  if (!resource) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Resource not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-800 dark:text-neutral-100">{title}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        {alert && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              alert.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200'
                : alert.type === 'danger'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
                : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-200'
            }`}
            role="alert"
          >
            {alert.message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/50 md:grid-cols-2"
        >
          {visibleFields.map((field) => (
            <label key={field.name} className="flex flex-col gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold">{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={formData[field.name] ?? ''}
                  onChange={(event) => handleChange(field.name, event.target.value, field.type)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  <option value="">Select</option>
                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!formData[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.checked, field.type)}
                  className="h-4 w-4 rounded border-neutral-300 text-primary"
                />
              ) : (
                <input
                  type={field.type === 'json' ? 'text' : field.type || 'text'}
                  value={formData[field.name] ?? ''}
                  onChange={(event) => handleChange(field.name, event.target.value, field.type)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              )}
            </label>
          ))}
          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
          {loading ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    {(resource.columns || []).map((column) => (
                      <th key={column.label} className="px-3 py-2 font-semibold text-neutral-600 dark:text-neutral-400">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-neutral-100 dark:border-neutral-800">
                      {(resource.columns || []).map((column) => (
                        <td key={`${item._id}-${column.label}`} className="px-3 py-2 text-neutral-800 dark:text-neutral-100">
                          {formatDisplayValue(getValue(item, column.path))}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="text-primary hover:text-primary/80"
                          >
                            Edit
                          </button>
                          {resource.allowDelete !== false && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id)}
                              className="text-danger hover:text-danger/80"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!items.length && !loading && (
                    <tr>
                      <td colSpan={(resource.columns || []).length + 1} className="px-3 py-6 text-center text-sm text-neutral-500">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default HRResourcePage;
