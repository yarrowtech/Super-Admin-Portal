import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { portalSupportApi } from '../../services/portalSupportApi';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// ─── Design tokens ────────────────────────────────────────────────────────────
const tone = {
  open:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  resolved:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  closed:      'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  low:         'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  normal:      'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high:        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  urgent:      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};
const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[value] || tone.low}`}>
    {String(value || '').replace(/_/g, ' ')}
  </span>
);
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);
const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);
const SectionHdr = ({ title }) => (
  <h2 className="mb-4 text-base font-bold text-neutral-900 dark:text-white">{title}</h2>
);
const Inp = ({ className = '', ...props }) => (
  <input className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...props} />
);
const Sel = ({ children, ...props }) => (
  <select className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" {...props}>{children}</select>
);
const Txa = ({ className = '', ...props }) => (
  <textarea className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...props} />
);
const BtnPrimary = ({ children, className = '', ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 ${className}`} {...props}>{children}</button>
);
const BtnSecondary = ({ children, className = '', ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 ${className}`} {...props}>{children}</button>
);
const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
    ))}
  </div>
);
const EmptyState = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-center">
    <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">{icon}</span>
    <p className="font-semibold text-neutral-600 dark:text-neutral-300">{title}</p>
    {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
  </div>
);

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── FAQ items per portal ─────────────────────────────────────────────────────
const PORTAL_FAQS = {
  hr: [
    { q: 'How do I request leave for an employee?', a: 'Go to Leave Management, select the employee and submit a leave request on their behalf. The employee will be notified.' },
    { q: 'How do I add a new employee?', a: 'Navigate to Users → Add Employee. Fill in the required details and assign the correct department and role.' },
    { q: 'How is attendance tracked?', a: 'Attendance is tracked via employee check-in/check-out. You can view reports in the Attendance section.' },
    { q: 'How do I approve recruitment applications?', a: 'Go to Recruitment, review candidate applications and click Approve or Reject for each one.' },
    { q: 'Where can I view performance reports?', a: 'Performance KPIs are available in the Performance section. You can filter by department or individual employee.' },
  ],
  manager: [
    { q: 'How do I assign tasks to team members?', a: 'Go to Work Board or Tasks, create a new task and assign it to a team member. They will receive a notification.' },
    { q: 'How do I approve leave requests?', a: 'Leave requests appear in Leave Management. Review and approve or reject each request.' },
    { q: 'How do I track project progress?', a: 'Use the Work Board or Products section to see task statuses and progress bars for your team\'s projects.' },
    { q: 'How do I post a recruitment requirement?', a: 'Go to Recruitment → Post a Job. Fill in the role details and it will be visible to HR for processing.' },
    { q: 'How do I view team reports?', a: 'Go to Reports to see attendance, task completion, and performance metrics for your team.' },
  ],
  employee: [
    { q: 'How do I apply for leave?', a: 'Go to Leave, click "Apply for Leave", select the dates and type, and submit. Your manager will be notified.' },
    { q: 'How do I view my tasks?', a: 'Your assigned tasks are in the Tasks section. You can update the status of each task as you work on them.' },
    { q: 'How do I download my payslip?', a: 'Go to Documents → Payslips. Select the month and click Download to get your payslip PDF.' },
    { q: 'How do I update my profile?', a: 'Go to My Profile and click Edit Profile to update your details, skills, and contact information.' },
    { q: 'How do I apply for an internal job?', a: 'Go to Jobs to see open positions and click Apply to submit your application.' },
  ],
  it: [
    { q: 'How do I raise an IT ticket?', a: 'Use this Support page to submit a technical ticket. The IT team will respond within 4 business hours.' },
    { q: 'How do I request new hardware or software?', a: 'Submit a support ticket with category "System" and describe what you need. Include justification and urgency.' },
    { q: 'How do I access the IT asset list?', a: 'IT assets assigned to your team are tracked in the Assets section of the IT portal.' },
    { q: 'What to do if I have a system outage?', a: 'Submit an urgent support ticket immediately. For critical outages, also contact IT directly via Slack or phone.' },
    { q: 'How do I get VPN or remote access?', a: 'Raise a ticket with category "Access" describing the access you need and your manager\'s approval.' },
  ],
  ceo: [
    { q: 'How do I view company-wide reports?', a: 'Dashboard provides live KPIs. Use the Reports section for in-depth company performance analysis.' },
    { q: 'How do I approve strategic projects?', a: 'Escalated projects appear in your dashboard notification panel for review and approval.' },
    { q: 'How do I access legal approval requests?', a: 'Legal items requiring CEO sign-off appear in the Legal Approval section of your portal.' },
    { q: 'How do I contact the IT or admin team?', a: 'Use this Support page to raise a request. High-priority requests are escalated immediately.' },
  ],
  law: [
    { q: 'How do I review a contract?', a: 'Go to Contracts and select the contract to review. You can add annotations and approve or flag issues.' },
    { q: 'How do I upload a legal document?', a: 'In Legal Docs, click Upload Document, select the file and fill in the required metadata.' },
    { q: 'How do I track regulatory compliance?', a: 'The Compliance section lists all active compliance requirements with their deadlines and status.' },
    { q: 'How do I get a contract approved by the CEO?', a: 'Escalate the contract from the Contracts section. It will appear in the CEO portal for final approval.' },
  ],
  finance: [
    { q: 'How do I process payroll?', a: 'Go to Payroll, select the period, review the summary and click Process Payroll. All employees will be notified.' },
    { q: 'How do I add a vendor invoice?', a: 'Go to Vendors → Invoices and click Add Invoice. Fill in the vendor details and amount for approval.' },
    { q: 'How do I generate financial reports?', a: 'Go to Reports and select the report type, date range and format (PDF/Excel) then click Generate.' },
    { q: 'How do I manage expense requests?', a: 'Expense requests appear in the Expenses section. Review and approve or reject each one.' },
  ],
  media: [
    { q: 'How do I submit content for approval?', a: 'Upload your content in the Media portal and assign it for review. The editor will be notified.' },
    { q: 'How do I track campaign performance?', a: 'Campaign metrics are available in the Analytics section of your dashboard.' },
    { q: 'How do I collaborate with the team?', a: 'Use the Chat section to coordinate with team members in real time.' },
  ],
  default: [
    { q: 'How do I contact the admin team?', a: 'Submit a support ticket from this page. Our team responds within 24 hours.' },
    { q: 'How do I update my account information?', a: 'Go to Settings → Account to update your name, phone, and other details.' },
    { q: 'How do I change my password?', a: 'Go to Settings → Security and use the Change Password form.' },
  ],
};

const getFaq = (portal) => PORTAL_FAQS[portal] || PORTAL_FAQS.default;

// ─── Ticket detail slide-over ─────────────────────────────────────────────────
const TicketSlideOver = ({ ticket, onClose }) => {
  if (!ticket) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-neutral-950">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 p-5 dark:border-neutral-800">
          <div>
            <p className="text-xs font-semibold text-neutral-400">#{ticket._id.slice(-8).toUpperCase()}</p>
            <h3 className="mt-0.5 text-base font-bold text-neutral-900 dark:text-white">{ticket.subject}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill value={ticket.status} />
              <Pill value={ticket.priority} />
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {ticket.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Original message */}
          <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
            <p className="mb-1 text-xs text-neutral-400">Original request · {fmtTime(ticket.createdAt)}</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Replies */}
          {ticket.replies?.length > 0 ? ticket.replies.map((r, i) => (
            <div key={i} className={`rounded-xl p-4 ${r.isAdminReply ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white border border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800'}`}>
              <p className="mb-1 text-xs text-neutral-400">
                {r.isAdminReply ? '👤 Support Team' : 'You'} · {fmtTime(r.createdAt)}
              </p>
              <p className={`text-sm whitespace-pre-wrap ${r.isAdminReply ? 'text-indigo-800 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {r.message}
              </p>
            </div>
          )) : (
            <p className="text-center text-xs text-neutral-400 py-8">No replies yet. Our team will respond soon.</p>
          )}
        </div>

        <div className="border-t border-neutral-200 p-5 dark:border-neutral-800">
          <p className="text-xs text-neutral-400">Submitted on {fmt(ticket.createdAt)}</p>
        </div>
      </aside>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
// portal      — string key: 'hr', 'manager', 'employee', etc.
// portalLabel — display name e.g. "HR", "Manager", "Employee"
// accentColor — hex color for header accent bar
const PortalSupportPage = ({ portal = 'other', portalLabel = 'Portal', accentColor = '#6366f1' }) => {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('ticket');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [err, setErr] = useState('');

  const faqItems = getFaq(portal);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const r = await portalSupportApi.getMyTickets(token);
      setTickets(r.data || []);
    } catch {}
    finally { setTicketsLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === 'my') loadTickets(); }, [tab, loadTickets]);

  // Real-time: receive admin replies and status changes
  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!token || !userId) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', `support:user:${userId}`);
    socket.on('support:ticket_updated', ({ _id, status } = {}) => {
      // refresh ticket list silently; update selected if open
      loadTickets();
      setSelected((prev) => (prev && String(prev._id) === String(_id) ? { ...prev, status: status || prev.status } : prev));
    });
    return () => socket.disconnect();
  }, [token, user?.id, user?._id]);

  const submitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true); setErr('');
    try {
      await portalSupportApi.createTicket(token, form);
      setSubmitted(true);
      setForm({ subject: '', category: 'general', priority: 'normal', description: '' });
    } catch (ex) {
      setErr(ex.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Page header */}
      <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="h-1 w-full" style={{ background: accentColor }} />
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: accentColor }}>
            <span className="material-symbols-outlined text-[20px] text-white">support_agent</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">{portalLabel} Support</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Get help, report issues, and find answers</p>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'ticket', label: 'Open a Ticket' }, { key: 'my', label: 'My Tickets' }, { key: 'faq', label: 'FAQ' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Open a ticket */}
      {tab === 'ticket' && (
        <Card>
          <Inner>
            <SectionHdr title="Submit a Support Request" />
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                <p className="text-lg font-semibold text-neutral-900 dark:text-white">Ticket Submitted!</p>
                <p className="text-sm text-neutral-400">Our support team will respond within 24 hours.</p>
                <BtnSecondary onClick={() => setSubmitted(false)}>Submit Another</BtnSecondary>
              </div>
            ) : (
              <form className="space-y-4 max-w-lg" onSubmit={submitTicket}>
                {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">{err}</p>}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Subject</label>
                  <Inp placeholder="Brief description of your issue" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Category</label>
                    <Sel value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="general">General</option>
                      <option value="technical">Technical Problem</option>
                      <option value="access">Access / Permissions</option>
                      <option value="payroll">Payroll / Payments</option>
                      <option value="hr">HR / Policies</option>
                      <option value="system">System / IT</option>
                      <option value="account">Account Issue</option>
                      <option value="other">Other</option>
                    </Sel>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Priority</label>
                    <Sel value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Sel>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Description</label>
                  <Txa rows={5} placeholder="Describe your issue in detail…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <BtnPrimary type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </BtnPrimary>
              </form>
            )}
          </Inner>
        </Card>
      )}

      {/* My tickets */}
      {tab === 'my' && (
        <Card>
          <Inner>
            <div className="mb-4 flex items-center justify-between">
              <SectionHdr title="My Support Tickets" />
              <button onClick={loadTickets} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
              </button>
            </div>
            {ticketsLoading ? <Skeleton /> : tickets.length === 0 ? (
              <EmptyState icon="support_agent" title="No tickets yet" subtitle="Submit a ticket from the 'Open a Ticket' tab." />
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <button key={t._id} onClick={() => setSelected(t)}
                    className="w-full rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-neutral-400 capitalize">
                          {t.category} · {fmt(t.createdAt)}
                          {t.replies?.length > 0 && ` · ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Pill value={t.status} />
                        <Pill value={t.priority} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Inner>
        </Card>
      )}

      {/* FAQ */}
      {tab === 'faq' && (
        <Card>
          <Inner>
            <SectionHdr title="Frequently Asked Questions" />
            <div className="space-y-2 max-w-2xl">
              {faqItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.q}</span>
                    <span className="material-symbols-outlined text-[18px] text-neutral-400 transition"
                      style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      expand_more
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Inner>
        </Card>
      )}

      {/* Ticket detail slide-over */}
      {selected && <TicketSlideOver ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default PortalSupportPage;
