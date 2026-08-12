import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { portalSupportApi } from '../../services/portalSupportApi';
import ThemeToggleButton from '../common/ThemeToggleButton';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Design tokens ────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);
const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);
const SectionHdr = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h2>
    {subtitle && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
  </div>
);
const Inp = ({ className = '', ...props }) => (
  <input className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-500 dark:focus:ring-neutral-800 ${className}`} {...props} />
);
const Sel = ({ children, className = '', ...props }) => (
  <select className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...props}>{children}</select>
);
const BtnPrimary = ({ children, className = '', ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 ${className}`} {...props}>{children}</button>
);
const Toggle = ({ value, onChange }) => (
  <button type="button" onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition dark:bg-neutral-950 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);
const Skeleton = ({ rows = 4 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
    ))}
  </div>
);
const Msg = ({ type, text }) => !text ? null : (
  <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${type === 'ok' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'}`}>
    {text}
  </div>
);
const FieldError = ({ message }) => (!message ? null : (
  <p className="mt-1 text-[11px] font-semibold text-rose-500">{message}</p>
));

// ─── Main component ────────────────────────────────────────────────────────────
// portalLabel  — display name e.g. "HR", "Manager", "Employee"
// accentColor  — hex string for header accent bar
const PortalSettingsPage = ({ portalLabel = 'Portal', accentColor = '#6366f1' }) => {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', timezone: 'Asia/Kolkata', language: 'English',
  });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwFieldErrors, setPwFieldErrors] = useState({});
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    emailAssignments: true, emailUpdates: true, emailAlerts: true, emailSystem: false,
  });
  const [privacyPrefs, setPrivacyPrefs] = useState({
    showProfile: true, showOnline: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const json = await res.json();
        const p = json?.data || {};
        const m = p?.metadata || {};
        setForm({
          firstName: p.firstName || user?.firstName || '',
          lastName: p.lastName || user?.lastName || '',
          email: p.email || user?.email || '',
          phone: m.phone || p.phone || '',
          timezone: m.timezone || 'Asia/Kolkata',
          language: m.language || 'English',
        });
        if (m.notifPrefs) setNotifPrefs((prev) => ({ ...prev, ...m.notifPrefs }));
        if (m.privacyPrefs) setPrivacyPrefs((prev) => ({ ...prev, ...m.privacyPrefs }));
      } catch {
        // fallback to auth context user
        if (user) {
          setForm((prev) => ({ ...prev, firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '' }));
        }
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token, user]);

  const saveAccount = async () => {
    try {
      setSaving(true); setMsg({ type: '', text: '' });
      await fetch(`${API_BASE}/api/profile/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }),
      });
      // store timezone/language in metadata via preferences endpoint
      await portalSupportApi.updatePreferences(token, {
        notifPrefs: { ...notifPrefs, timezone: form.timezone, language: form.language },
      });
      setMsg({ type: 'ok', text: 'Account settings saved!' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setMsg({ type: '', text: '' });
    setPwFieldErrors({});
    const clientErrors = {};
    if (!pwForm.current) clientErrors.currentPassword = 'Current password is required.';
    if (!pwForm.next) clientErrors.newPassword = 'New password is required.';
    else if (pwForm.next.length < 6) clientErrors.newPassword = 'New password must be at least 6 characters.';
    if (!pwForm.confirm) clientErrors.confirm = 'Please confirm your new password.';
    else if (pwForm.next && pwForm.next !== pwForm.confirm) clientErrors.confirm = 'Passwords do not match.';
    if (Object.keys(clientErrors).length) {
      setPwFieldErrors(clientErrors);
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMap = Array.isArray(json?.errors)
          ? json.errors.reduce((acc, item) => (item?.field ? { ...acc, [item.field]: item.message } : acc), {})
          : {};
        if (Object.keys(errorMap).length) {
          setPwFieldErrors(errorMap);
        } else {
          setMsg({ type: 'err', text: json?.error || json?.message || 'Failed to change password' });
        }
        return;
      }
      setPwForm({ current: '', next: '', confirm: '' });
      setMsg({ type: 'ok', text: 'Password updated successfully!' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const logoutOtherSessions = async () => {
    setMsg({ type: '', text: '' });
    try {
      setLoggingOutAll(true);
      const res = await fetch(`${API_BASE}/api/auth/logout-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to log out other devices');
      setMsg({ type: 'ok', text: json?.message || 'Logged out of all other devices.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Failed to log out other devices' });
    } finally {
      setLoggingOutAll(false);
    }
  };

  const savePreferences = async (type) => {
    try {
      setSaving(true); setMsg({ type: '', text: '' });
      await portalSupportApi.updatePreferences(token, type === 'notif' ? { notifPrefs } : { privacyPrefs });
      setMsg({ type: 'ok', text: 'Preferences saved!' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'account', icon: 'person', label: 'Account' },
    { key: 'security', icon: 'lock', label: 'Security' },
    { key: 'notifications', icon: 'notifications', label: 'Notifications' },
    { key: 'privacy', icon: 'visibility', label: 'Privacy' },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Page header */}
      <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="h-1 w-full" style={{ background: accentColor }} />
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: accentColor }}>
              <span className="material-symbols-outlined text-[20px] text-white">settings</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">{portalLabel} Settings</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage your account preferences and security</p>
            </div>
          </div>
          <ThemeToggleButton />
        </div>
      </header>

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Sidebar tabs */}
        <aside className="shrink-0 xl:w-52">
          <Card>
            <Inner className="p-2">
              <nav className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.key} onClick={() => { setTab(t.key); setMsg({ type: '', text: '' }); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'}`}>
                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </nav>
            </Inner>
          </Card>
        </aside>

        {/* Content panel */}
        <div className="flex-1 space-y-4">
          <Msg type={msg.type} text={msg.text} />

          {/* Account tab */}
          {tab === 'account' && (
            <Card>
              <Inner>
                <SectionHdr title="Account Information" subtitle="Update your personal details" />
                {loading ? <Skeleton rows={5} /> : (
                  <div className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500">First Name</label>
                        <Inp value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500">Last Name</label>
                        <Inp value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500">Email (read-only)</label>
                      <Inp value={form.email} readOnly className="cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500">Phone</label>
                      <Inp value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500">Timezone</label>
                        <Sel value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                          {['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'].map((tz) => <option key={tz}>{tz}</option>)}
                        </Sel>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500">Language</label>
                        <Sel value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                          {['English', 'Hindi', 'Tamil', 'Telugu'].map((l) => <option key={l}>{l}</option>)}
                        </Sel>
                      </div>
                    </div>
                    <BtnPrimary onClick={saveAccount} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </BtnPrimary>
                  </div>
                )}
              </Inner>
            </Card>
          )}

          {/* Security tab */}
          {tab === 'security' && (
            <Card>
              <Inner>
                <SectionHdr title="Security Settings" subtitle="Change your password and manage 2FA" />
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Current Password</label>
                    <Inp
                      type="password"
                      value={pwForm.current}
                      onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setPwFieldErrors((f) => ({ ...f, currentPassword: undefined })); }}
                      placeholder="••••••••"
                      className={pwFieldErrors.currentPassword ? 'border-rose-400! focus:ring-rose-200!' : ''}
                    />
                    <FieldError message={pwFieldErrors.currentPassword} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">New Password</label>
                    <Inp
                      type="password"
                      value={pwForm.next}
                      onChange={(e) => { setPwForm({ ...pwForm, next: e.target.value }); setPwFieldErrors((f) => ({ ...f, newPassword: undefined })); }}
                      placeholder="Min. 6 characters"
                      className={pwFieldErrors.newPassword ? 'border-rose-400! focus:ring-rose-200!' : ''}
                    />
                    <FieldError message={pwFieldErrors.newPassword} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Confirm New Password</label>
                    <Inp
                      type="password"
                      value={pwForm.confirm}
                      onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwFieldErrors((f) => ({ ...f, confirm: undefined })); }}
                      placeholder="Repeat new password"
                      className={pwFieldErrors.confirm ? 'border-rose-400! focus:ring-rose-200!' : ''}
                    />
                    <FieldError message={pwFieldErrors.confirm} />
                  </div>
                  <BtnPrimary onClick={changePassword} disabled={saving}>
                    {saving ? 'Updating…' : 'Update Password'}
                  </BtnPrimary>
                </div>
                <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-neutral-500">Add an extra layer of security to your account.</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">Coming soon</span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Active Sessions</p>
                      <p className="text-xs text-neutral-500">Signed in on another browser or device you don't recognize? Sign it out from here.</p>
                    </div>
                    <BtnPrimary onClick={logoutOtherSessions} disabled={loggingOutAll} className="bg-rose-600! hover:bg-rose-500! dark:bg-rose-600! dark:hover:bg-rose-500!">
                      {loggingOutAll ? 'Signing out…' : 'Log out of all other devices'}
                    </BtnPrimary>
                  </div>
                </div>
              </Inner>
            </Card>
          )}

          {/* Notifications tab */}
          {tab === 'notifications' && (
            <Card>
              <Inner>
                <SectionHdr title="Notification Preferences" subtitle="Choose what you want to be notified about" />
                <div className="space-y-4 max-w-lg">
                  {[
                    { key: 'emailAssignments', label: 'Task / Assignment Alerts', sub: 'When a task or job is assigned to you' },
                    { key: 'emailUpdates', label: 'Status Updates', sub: 'When tickets or projects are updated' },
                    { key: 'emailAlerts', label: 'Important Alerts', sub: 'Leave approvals, deadline reminders' },
                    { key: 'emailSystem', label: 'System Announcements', sub: 'Maintenance and platform notices' },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
                        <p className="text-xs text-neutral-500">{sub}</p>
                      </div>
                      <Toggle value={notifPrefs[key]} onChange={(v) => setNotifPrefs({ ...notifPrefs, [key]: v })} />
                    </div>
                  ))}
                  <BtnPrimary onClick={() => savePreferences('notif')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Preferences'}
                  </BtnPrimary>
                </div>
              </Inner>
            </Card>
          )}

          {/* Privacy tab */}
          {tab === 'privacy' && (
            <Card>
              <Inner>
                <SectionHdr title="Privacy & Visibility" subtitle="Control what others can see about you" />
                <div className="space-y-4 max-w-lg">
                  {[
                    { key: 'showProfile', label: 'Show Profile to Admins', sub: 'Allow admins to view your full profile' },
                    { key: 'showOnline', label: 'Show Online Status', sub: 'Let others see when you are active' },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
                        <p className="text-xs text-neutral-500">{sub}</p>
                      </div>
                      <Toggle value={privacyPrefs[key]} onChange={(v) => setPrivacyPrefs({ ...privacyPrefs, [key]: v })} />
                    </div>
                  ))}
                  <BtnPrimary onClick={() => savePreferences('privacy')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Preferences'}
                  </BtnPrimary>
                </div>
              </Inner>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalSettingsPage;
