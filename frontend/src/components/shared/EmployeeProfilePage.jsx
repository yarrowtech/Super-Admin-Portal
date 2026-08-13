import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileApi } from '../../services/profile';
import ThemeToggleButton from '../common/ThemeToggleButton';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (mirrors the Outsourcing/Freelancer profile page so every
// portal's "Profile" tab looks and behaves the same way)
// ─────────────────────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);
const Inner = ({ children, className = '' }) => <div className={`p-5 lg:p-6 ${className}`}>{children}</div>;

const PageHdr = ({ title, subtitle, icon = 'person', action }) => (
  <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full" style={{ background: 'var(--portal-accent, #6366f1)' }} />
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: 'var(--portal-accent, #6366f1)' }}>
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <ThemeToggleButton />
      </div>
    </div>
  </header>
);

const SectionHdr = ({ title, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
    {action}
  </div>
);

const StatCard = ({ icon, label, value, accentIcon = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300' }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-base ${accentIcon}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value}</p>
    </Inner>
  </Card>
);

const Skeleton = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const Inp = ({ className = '', ...p }) => (
  <input className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600 ${className}`} {...p} />
);
const Txa = ({ className = '', ...p }) => (
  <textarea className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...p} />
);
const Sel = ({ children, className = '', ...p }) => (
  <select className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...p}>{children}</select>
);
const BtnPrimary = ({ children, className = '', ...p }) => (
  <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${className}`} style={{ background: 'var(--portal-accent, #6366f1)' }} {...p}>{children}</button>
);
const BtnSecondary = ({ children, className = '', ...p }) => (
  <button className={`rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${className}`} {...p}>{children}</button>
);

const avatarBg = (s = '') => {
  const p = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfffffff;
  return p[h % p.length];
};
const initials = (u) => `${(u?.firstName || '')[0] || ''}${(u?.lastName || '')[0] || ''}`.toUpperCase() || (u?.email || 'U')[0].toUpperCase();

const defaultForm = () => ({
  firstName: '', lastName: '', phone: '', title: '', bio: '',
  city: '', country: '', timezone: '', hourlyRate: '', availability: '', skillsCsv: '',
  accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', accountType: '',
  upiId: '', paypalEmail: '',
  entityType: 'individual', businessName: '', website: '', foundedYear: '', teamSize: '', teamMembers: [],
});

const BUSINESS_DOC_TYPES = [
  { key: 'companyRegistration', label: 'Company Registration', icon: 'gavel' },
  { key: 'gstDocument', label: 'GST / Tax Document', icon: 'receipt_long' },
  { key: 'businessCertificate', label: 'Business Certificate', icon: 'workspace_premium' },
  { key: 'portfolio', label: 'Portfolio', icon: 'photo_library' },
  { key: 'certifications', label: 'Certifications', icon: 'verified' },
];

const DocUploadCard = ({ label, icon, accept, currentUrl, currentName, uploading, error, onUpload }) => {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };
  const uploaded = Boolean(currentUrl);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
          <span className="material-symbols-outlined text-[20px] text-indigo-600">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
          {uploaded
            ? <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">✓ {currentName || 'Uploaded'}</p>
            : <p className="text-xs text-neutral-400">No file uploaded</p>}
        </div>
        {uploaded && (
          <a href={currentUrl} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
        )}
      </div>
      {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-semibold text-indigo-600 transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
      >
        <span className="material-symbols-outlined text-[17px]">{uploading ? 'hourglass_top' : uploaded ? 'upload' : 'cloud_upload'}</span>
        {uploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
};

// portalLabel — display name used in the header's title role fallback (e.g. "Media Marketing")
const EmployeeProfilePage = ({ portalLabel = 'Team Member' }) => {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState('personal');
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [docsUploading, setDocsUploading] = useState({});
  const [docsError, setDocsError] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileApi.getMyProfile(token);
      const u = res?.data?.user || null;
      setProfile(u);
      if (u) {
        const p = u.profile || {};
        const basic = p.basic || {};
        const professional = p.professional || {};
        const payment = p.payment || {};
        setForm({
          firstName: u.firstName || '', lastName: u.lastName || '',
          phone: basic.phone || u.phone || '', title: professional.title || '', bio: basic.bio || '',
          city: basic.city || '', country: basic.country || '', timezone: basic.timezone || '',
          hourlyRate: professional.hourlyRate || '', availability: professional.availability || '',
          skillsCsv: (p.skills || []).map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean).join(', '),
          accountHolderName: payment.bankDetails?.accountHolderName || '',
          bankName: payment.bankDetails?.bankName || '',
          accountNumber: payment.bankDetails?.accountNumber || '',
          ifscCode: payment.bankDetails?.ifscCode || '',
          accountType: payment.bankDetails?.accountType || '',
          upiId: payment.upiId || '',
          paypalEmail: payment.paypalEmail || '',
          entityType: professional.entityType || 'individual',
          businessName: professional.businessName || '',
          website: professional.website || '',
          foundedYear: professional.foundedYear || '',
          teamSize: professional.teamSize || '',
          teamMembers: Array.isArray(p.teamMembers) ? p.teamMembers : [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const fld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async () => {
    try {
      setSaving(true); setMsg('');
      await profileApi.updateMyProfile(token, {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        title: form.title, bio: form.bio, city: form.city, country: form.country,
        timezone: form.timezone, hourlyRate: Number(form.hourlyRate) || 0,
        availability: form.availability,
        skills: form.skillsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        bankDetails: { accountHolderName: form.accountHolderName, bankName: form.bankName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, accountType: form.accountType },
        paymentInfo: { upiId: form.upiId, paypalEmail: form.paypalEmail },
        entityType: form.entityType,
        businessName: form.businessName,
        website: form.website,
        foundedYear: form.foundedYear === '' ? undefined : Number(form.foundedYear) || 0,
        teamSize: form.teamSize === '' ? undefined : Number(form.teamSize) || 0,
        teamMembers: form.teamMembers,
      });
      setMsg('Saved!');
      await load();
    } catch (e) {
      setMsg(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    setAvatarUploading(true); setAvatarError('');
    try {
      const res = await profileApi.uploadAvatar(token, file);
      const avatarUrl = res?.data?.avatarUrl;
      if (avatarUrl) setProfile((p) => ({ ...p, profileImage: avatarUrl }));
    } catch (e) {
      setAvatarError(e.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadResume = async (file) => {
    setResumeUploading(true); setResumeError('');
    try {
      const res = await profileApi.uploadResume(token, file);
      const resumeUrl = res?.data?.resumeUrl;
      if (resumeUrl) setProfile((p) => ({ ...p, profile: { ...(p?.profile || {}), resumeUrl } }));
    } catch (e) {
      setResumeError(e.message || 'Upload failed');
    } finally {
      setResumeUploading(false);
    }
  };

  const uploadBusinessDoc = (docType) => async (file) => {
    setDocsUploading((s) => ({ ...s, [docType]: true }));
    setDocsError((s) => ({ ...s, [docType]: '' }));
    try {
      const res = await profileApi.uploadProfileDocument(token, file, docType);
      const data = res?.data;
      if (data?.url) {
        setProfile((p) => ({
          ...p,
          profile: {
            ...(p?.profile || {}),
            documents: { ...(p?.profile?.documents || {}), [docType]: { url: data.url, fileName: data.fileName } },
          },
        }));
      }
    } catch (e) {
      setDocsError((s) => ({ ...s, [docType]: e.message || 'Upload failed' }));
    } finally {
      setDocsUploading((s) => ({ ...s, [docType]: false }));
    }
  };

  const p = profile?.profile || {};
  const basic = p.basic || {};
  const professional = p.professional || {};
  const payment = p.payment || {};
  const documents = p.documents || {};
  const skills = (p.skills || []).map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
  const teamMembers = Array.isArray(p.teamMembers) ? p.teamMembers : [];

  // entityType drives which flavor of the profile renders below. Missing/
  // unrecognized values fall back to 'individual' so every existing profile
  // (HR/IT/Finance/Law/CEO/Media, all of which have never set this field)
  // renders exactly the same UI it always has.
  const entityType = professional.entityType || 'individual';
  const isOrg = entityType === 'team' || entityType === 'agency';
  const isAgency = entityType === 'agency';

  const displayName = (isOrg && professional.businessName)
    ? professional.businessName
    : (`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || authUser?.email || portalLabel);
  const bg = avatarBg(displayName);
  const avatarUrl = profile?.profileImage;
  const completion = Number(p.completion) || 0;

  // Tabs are derived from form.entityType (the in-progress edit value), not
  // the last-saved profile, so switching type in the modal immediately
  // reveals the right tabs before Save is clicked.
  const editEntityType = form.entityType || 'individual';
  const editIsOrg = editEntityType === 'team' || editEntityType === 'agency';
  const EDIT_TABS = editIsOrg
    ? [
        { id: 'personal', label: editEntityType === 'agency' ? 'Agency Info' : 'Team Info', icon: 'person' },
        { id: 'team',     label: 'Team Members',   icon: 'groups' },
        { id: 'bank',     label: 'Bank & Payment', icon: 'account_balance' },
        { id: 'docs',     label: 'Documents',      icon: 'folder_open' },
      ]
    : [
        { id: 'personal', label: 'Personal Info', icon: 'person' },
        { id: 'bank',     label: 'Bank & Payment', icon: 'account_balance' },
        { id: 'docs',     label: 'Documents',      icon: 'folder_open' },
      ];

  if (loading) return <main className="portal-page"><div className="portal-page-inner"><Skeleton rows={6} /></div></main>;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PageHdr
          title="Profile" subtitle="Your professional profile and contact details" icon="person"
          action={<BtnPrimary onClick={() => { setEditTab('personal'); setEditOpen(true); }}><span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">edit</span>Edit Profile</span></BtnPrimary>}
        />

        {/* Hero card */}
        <Card>
          <div className="h-28 rounded-t-2xl bg-linear-to-r from-violet-600 via-indigo-600 to-blue-500" />
          <Inner className="-mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="relative">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-neutral-950" />
                    : <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white text-3xl font-bold text-white shadow-lg dark:border-neutral-950 ${bg}`}>{initials(profile || authUser)}</div>}
                  <button
                    onClick={() => { setEditTab('docs'); setEditOpen(true); }}
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow dark:border-neutral-950"
                    style={{ background: 'var(--portal-accent, #6366f1)' }}
                    title="Change photo"
                  >
                    <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                  </button>
                </div>
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{displayName}</h2>
                    {isOrg && (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {entityType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{professional.title || (isAgency ? 'Agency' : isOrg ? 'Team' : portalLabel)}</p>
                  {(basic.city || basic.country) && (
                    <p className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {[basic.city, basic.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Profile completeness</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">{completion}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-blue-500 transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </Inner>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {isOrg ? (
            <>
              <StatCard icon="work" label="Total Projects" value={0} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
              <StatCard icon="bolt" label="Active Projects" value={0} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
              <StatCard icon="handshake" label="Active Contracts" value={0} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
              <StatCard icon="groups" label="Team Members" value={teamMembers.length} accentIcon="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" />
            </>
          ) : (
            <>
              <StatCard icon="work" label="Total Jobs" value={0} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
              <StatCard icon="schedule" label="Hours Logged" value="0h" accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
              <StatCard icon="handshake" label="Active Contracts" value={0} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
              <StatCard icon="task_alt" label="Completed Jobs" value={0} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <Inner>
              <SectionHdr title="Contact Info" />
              <div className="space-y-3 text-sm">
                {(isOrg ? [
                  { icon: 'email', label: 'Email', value: profile?.email },
                  { icon: 'phone', label: 'Phone', value: basic.phone || profile?.phone || '—' },
                  { icon: 'location_on', label: 'Location', value: [basic.city, basic.country].filter(Boolean).join(', ') || '—' },
                  { icon: 'language', label: 'Website', value: professional.website || 'No website added' },
                ] : [
                  { icon: 'email', label: 'Email', value: profile?.email },
                  { icon: 'phone', label: 'Phone', value: basic.phone || profile?.phone || '—' },
                  { icon: 'public', label: 'Timezone', value: basic.timezone || '—' },
                  { icon: 'schedule', label: 'Availability', value: professional.availability || '—' },
                  { icon: 'currency_rupee', label: 'Hourly Rate', value: professional.hourlyRate ? `₹${professional.hourlyRate}/hr` : '—' },
                ]).map((r) => (
                  <div key={r.label} className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-base text-neutral-400">{r.icon}</span>
                    <div>
                      <p className="text-xs text-neutral-400">{r.label}</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Inner>
          </Card>

          <Card>
            <Inner>
              <SectionHdr title={isAgency ? 'About Agency' : isOrg ? 'About Team' : 'Skills & Bio'} />
              {basic.bio && <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{basic.bio}</p>}
              {skills.length > 0
                ? <div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">{s}</span>)}</div>
                : <p className="text-sm text-neutral-400">{isOrg ? 'No services added.' : 'No skills listed.'}</p>}
            </Inner>
          </Card>

          <Card>
            <Inner>
              <SectionHdr title={isAgency ? 'Business & Payment Details' : isOrg ? 'Team Payment Details' : 'Payment Details'} />
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Account Holder', value: payment.bankDetails?.accountHolderName || '—' },
                  { label: 'Bank', value: payment.bankDetails?.bankName || '—' },
                  { label: 'Account No.', value: payment.bankDetails?.accountNumber ? `••••${String(payment.bankDetails.accountNumber).slice(-4)}` : '—' },
                  { label: 'IFSC', value: payment.bankDetails?.ifscCode || '—' },
                  { label: 'UPI ID', value: payment.upiId || '—' },
                  { label: 'PayPal', value: payment.paypalEmail || '—' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    <span className="text-xs text-neutral-400">{r.label}</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.value}</span>
                  </div>
                ))}
              </div>
            </Inner>
          </Card>

          {isOrg && (
            <Card>
              <Inner>
                <SectionHdr title={isAgency ? 'Agency Details' : 'Team Details'} />
                <div className="space-y-2 text-sm">
                  {[
                    { label: isAgency ? 'Agency Type' : 'Team Type', value: professional.title || '—' },
                    { label: 'Team Size', value: professional.teamSize || 'Size not specified' },
                    { label: 'Location', value: [basic.city, basic.country].filter(Boolean).join(', ') || '—' },
                    { label: 'Founded', value: professional.foundedYear || 'Not specified' },
                    { label: 'Primary Contact', value: profile?.email || '—' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                      <span className="text-xs text-neutral-400">{r.label}</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.value}</span>
                    </div>
                  ))}
                </div>
              </Inner>
            </Card>
          )}

          {isOrg && (
            <Card>
              <Inner>
                <div className="mb-3 flex items-center justify-between">
                  <SectionHdr title="Team Members" />
                  <button onClick={() => { setEditTab('team'); setEditOpen(true); }} className="text-xs font-semibold hover:underline" style={{ color: 'var(--portal-accent, #6366f1)' }}>Manage Team →</button>
                </div>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-neutral-400">No team members added.</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((tm, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 dark:border-neutral-800">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg(tm.name || String(i))}`}>
                          {(tm.name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{tm.name || 'Unnamed'}</p>
                          <p className="truncate text-xs text-neutral-400">{tm.role || 'No role specified'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Inner>
            </Card>
          )}
        </div>

        {/* Documents section */}
        <Card>
          <Inner>
            <div className="mb-4 flex items-center justify-between">
              <SectionHdr title={isOrg ? 'Business Documents' : 'My Documents'} />
              <button onClick={() => { setEditTab('docs'); setEditOpen(true); }} className="text-xs font-semibold hover:underline" style={{ color: 'var(--portal-accent, #6366f1)' }}>Manage →</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${avatarUrl ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                  <span className={`material-symbols-outlined text-[18px] ${avatarUrl ? 'text-emerald-600' : 'text-neutral-400'}`}>account_circle</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{isOrg ? 'Logo' : 'Profile Photo'}</p>
                  {avatarUrl ? <a href={avatarUrl} target="_blank" rel="noreferrer" className="truncate text-[11px] text-emerald-600 hover:underline">View photo</a> : <p className="text-[11px] text-neutral-400">Not uploaded</p>}
                </div>
                <span className={`h-2 w-2 shrink-0 rounded-full ${avatarUrl ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
              </div>
              {!isOrg && (
                <div className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.resumeUrl ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${p.resumeUrl ? 'text-emerald-600' : 'text-neutral-400'}`}>description</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">CV / Resume</p>
                    {p.resumeUrl ? <a href={p.resumeUrl} target="_blank" rel="noreferrer" className="truncate text-[11px] text-emerald-600 hover:underline">View document</a> : <p className="text-[11px] text-neutral-400">Not uploaded</p>}
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.resumeUrl ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                </div>
              )}
              {isOrg && BUSINESS_DOC_TYPES.map((d) => {
                const doc = documents[d.key];
                return (
                  <div key={d.key} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${doc?.url ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                      <span className={`material-symbols-outlined text-[18px] ${doc?.url ? 'text-emerald-600' : 'text-neutral-400'}`}>{d.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{d.label}</p>
                      {doc?.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="truncate text-[11px] text-emerald-600 hover:underline">View document</a> : <p className="text-[11px] text-neutral-400">Not uploaded</p>}
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${doc?.url ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                  </div>
                );
              })}
            </div>
          </Inner>
        </Card>

        {/* Edit Modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-neutral-950 sm:rounded-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">manage_accounts</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">Edit Profile</h3>
                    <p className="text-xs text-neutral-400">{displayName}</p>
                  </div>
                </div>
                <button onClick={() => setEditOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-[20px] text-neutral-500">close</span>
                </button>
              </div>

              <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-6 dark:border-neutral-800">
                {EDIT_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditTab(t.id)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition ${editTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {editTab === 'personal' && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Type</label>
                      <Sel value={form.entityType} onChange={fld('entityType')}>
                        <option value="individual">Individual</option>
                        <option value="team">Team</option>
                        <option value="agency">Agency</option>
                      </Sel>
                    </div>

                    {editIsOrg && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editEntityType === 'agency' ? 'Agency Name' : 'Team Name'}</label>
                        <Inp placeholder={editEntityType === 'agency' ? 'e.g. Acme Media Agency' : 'e.g. Acme Content Team'} value={form.businessName} onChange={fld('businessName')} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Primary Contact — First Name' : 'First Name'}</label>
                        <Inp placeholder="First name" value={form.firstName} onChange={fld('firstName')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Primary Contact — Last Name' : 'Last Name'}</label>
                        <Inp placeholder="Last name" value={form.lastName} onChange={fld('lastName')} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {editEntityType === 'agency' ? 'Agency Type' : editEntityType === 'team' ? 'Team Type' : 'Professional Title'}
                      </label>
                      <Inp
                        placeholder={editIsOrg ? 'e.g. Media & Marketing Agency' : 'e.g. Marketing Executive'}
                        value={form.title} onChange={fld('title')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Description' : 'Bio'}</label>
                      <Txa rows={3} placeholder={editIsOrg ? 'Tell us about your team/agency…' : 'Tell us about yourself…'} value={form.bio} onChange={fld('bio')} />
                    </div>

                    {editIsOrg ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone</label>
                          <Inp placeholder="+91 9000000000" value={form.phone} onChange={fld('phone')} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Website</label>
                          <Inp placeholder="https://example.com" value={form.website} onChange={fld('website')} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone</label>
                          <Inp placeholder="+91 9000000000" value={form.phone} onChange={fld('phone')} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Hourly Rate (₹)</label>
                          <Inp placeholder="500" value={form.hourlyRate} onChange={fld('hourlyRate')} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">City</label>
                        <Inp placeholder="Mumbai" value={form.city} onChange={fld('city')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Country</label>
                        <Inp placeholder="India" value={form.country} onChange={fld('country')} />
                      </div>
                    </div>

                    {editIsOrg ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Founded Year</label>
                          <Inp placeholder="2018" value={form.foundedYear} onChange={fld('foundedYear')} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Team Size</label>
                          <Inp placeholder="12" value={form.teamSize} onChange={fld('teamSize')} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Timezone</label>
                          <Inp placeholder="Asia/Kolkata" value={form.timezone} onChange={fld('timezone')} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Availability</label>
                          <Inp placeholder="Full-time / Part-time" value={form.availability} onChange={fld('availability')} />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {editIsOrg ? 'Services' : 'Skills'} <span className="font-normal text-neutral-400">(comma-separated)</span>
                      </label>
                      <Inp placeholder={editIsOrg ? 'Media, Marketing, Branding…' : 'SEO, Content Strategy, Figma…'} value={form.skillsCsv} onChange={fld('skillsCsv')} />
                    </div>
                  </div>
                )}

                {editTab === 'team' && (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Add the people on your team. This is a simple roster shown on your profile — not a login/invite system.</p>
                    {form.teamMembers.length === 0 && (
                      <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-400 dark:border-neutral-700">No team members yet. Add your first team member.</p>
                    )}
                    <div className="space-y-3">
                      {form.teamMembers.map((tm, i) => (
                        <div key={i} className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Name</label>
                            <Inp placeholder="Full name" value={tm.name} onChange={(e) => setForm((f) => ({ ...f, teamMembers: f.teamMembers.map((row, ri) => (ri === i ? { ...row, name: e.target.value } : row)) }))} />
                          </div>
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Role</label>
                            <Inp placeholder="e.g. Creative Director" value={tm.role} onChange={(e) => setForm((f) => ({ ...f, teamMembers: f.teamMembers.map((row, ri) => (ri === i ? { ...row, role: e.target.value } : row)) }))} />
                          </div>
                          <button
                            onClick={() => setForm((f) => ({ ...f, teamMembers: f.teamMembers.filter((_, ri) => ri !== i) }))}
                            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            title="Remove"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <BtnSecondary
                      onClick={() => setForm((f) => (f.teamMembers.length >= 50 ? f : { ...f, teamMembers: [...f.teamMembers, { name: '', role: '' }] }))}
                      disabled={form.teamMembers.length >= 50}
                    >
                      + Add Team Member
                    </BtnSecondary>
                    {form.teamMembers.length >= 50 && <p className="text-xs text-neutral-400">Maximum of 50 team members.</p>}
                  </div>
                )}

                {editTab === 'bank' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      <span className="material-symbols-outlined mr-1 align-middle text-sm">info</span>
                      Bank details are used for payment processing. Keep them accurate.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Holder Name</label>
                        <Inp placeholder="Full name as per bank" value={form.accountHolderName} onChange={fld('accountHolderName')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Bank Name</label>
                        <Inp placeholder="e.g. HDFC Bank" value={form.bankName} onChange={fld('bankName')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Number</label>
                        <Inp placeholder="Account number" value={form.accountNumber} onChange={fld('accountNumber')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">IFSC Code</label>
                        <Inp placeholder="HDFC0001234" value={form.ifscCode} onChange={fld('ifscCode')} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Type</label>
                      <Inp placeholder="Savings / Current" value={form.accountType} onChange={fld('accountType')} />
                    </div>
                    <div className="mt-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">Online Payment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">UPI ID</label>
                          <Inp placeholder="name@upi" value={form.upiId} onChange={fld('upiId')} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">PayPal Email</label>
                          <Inp placeholder="paypal@email.com" value={form.paypalEmail} onChange={fld('paypalEmail')} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {editTab === 'docs' && (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Upload your documents securely. Files are accessible only to you and your admin.</p>
                    <DocUploadCard
                      label={editIsOrg ? 'Logo' : 'Profile Photo'} icon="account_circle" accept="image/*"
                      currentUrl={avatarUrl} currentName="Current photo"
                      uploading={avatarUploading} error={avatarError} onUpload={uploadAvatar}
                    />
                    {!editIsOrg && (
                      <DocUploadCard
                        label="CV / Resume" icon="description" accept=".pdf"
                        currentUrl={p.resumeUrl} currentName="Current resume"
                        uploading={resumeUploading} error={resumeError} onUpload={uploadResume}
                      />
                    )}
                    {editIsOrg && BUSINESS_DOC_TYPES.map((d) => (
                      <DocUploadCard
                        key={d.key}
                        label={d.label} icon={d.icon} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        currentUrl={documents[d.key]?.url} currentName={documents[d.key]?.fileName}
                        uploading={Boolean(docsUploading[d.key])} error={docsError[d.key]} onUpload={uploadBusinessDoc(d.key)}
                      />
                    ))}
                  </div>
                )}

                {msg && (
                  <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${msg === 'Saved!' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'}`}>
                    {msg}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
                <BtnSecondary onClick={() => setEditOpen(false)}>Cancel</BtnSecondary>
                {editTab !== 'docs' ? (
                  <BtnPrimary onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</BtnPrimary>
                ) : (
                  <button onClick={() => setEditOpen(false)} className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-bold text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900">
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default EmployeeProfilePage;
