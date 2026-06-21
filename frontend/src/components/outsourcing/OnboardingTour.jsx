import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

// ─── Tour step definitions ────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    icon: 'waving_hand',
    title: 'Welcome to the Outsourcing Portal!',
    body: "Let's take a quick tour so you know your way around. It only takes a minute — or skip anytime.",
    target: null,
  },
  {
    id: 'notif-bell',
    icon: 'notifications',
    title: 'Notifications',
    body: 'Click the bell to see your latest job assignments, contract updates, time log approvals, and more.',
    target: '[data-tour="notif-bell"]',
    side: 'bottom-left',
  },
  {
    id: 'nav-dashboard',
    icon: 'dashboard',
    title: 'Dashboard',
    body: 'Your home base — track work stats, logged hours, earnings, and recent activity at a glance.',
    target: 'a[href="/outsourcing/dashboard"]',
    side: 'right',
  },
  {
    id: 'nav-projects',
    icon: 'workspaces',
    title: 'Projects',
    body: 'See all the projects assigned to you and launch them directly with one click.',
    target: 'a[href="/outsourcing/projects"]',
    side: 'right',
  },
  {
    id: 'nav-jobs',
    icon: 'work',
    title: 'Jobs',
    body: 'Browse available jobs, accept or reject them, and track their status — working, submitted, or overdue.',
    target: 'a[href="/outsourcing/jobs"]',
    side: 'right',
  },
  {
    id: 'nav-contracts',
    icon: 'contract',
    title: 'Contracts',
    body: 'View your signed contracts, payment terms, and legal agreements in full detail.',
    target: 'a[href="/outsourcing/contracts"]',
    side: 'right',
  },
  {
    id: 'nav-timelogs',
    icon: 'schedule',
    title: 'Time Logs',
    body: 'Log your work hours for each job here. Approved hours are used to calculate your payments.',
    target: 'a[href="/outsourcing/time-logs"]',
    side: 'right',
  },
  {
    id: 'nav-payments',
    icon: 'payments',
    title: 'Payments',
    body: 'Track your earnings, milestones, and complete payment history — all in one place.',
    target: 'a[href="/outsourcing/payments"]',
    side: 'right',
  },
  {
    id: 'nav-profile',
    icon: 'person',
    title: 'Your Profile',
    body: 'Keep your profile, skills, and contact info updated so the team can reach you easily.',
    target: 'a[href="/outsourcing/profile"]',
    side: 'right',
  },
  {
    id: 'done',
    icon: 'celebration',
    title: "You're all set!",
    body: "You now know your way around. Start by checking your Dashboard or browsing available Jobs. Good luck!",
    target: null,
  },
];

const TOOLTIP_W = 340;
const SPOT_PAD = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function measureTarget(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - SPOT_PAD,
    left: r.left - SPOT_PAD,
    width: r.width + SPOT_PAD * 2,
    height: r.height + SPOT_PAD * 2,
  };
}

function tooltipStyle(spot, side) {
  if (!spot) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_W };
  }

  const vp = { w: window.innerWidth, h: window.innerHeight };

  if (side === 'right') {
    const top = Math.max(12, Math.min(vp.h - 240, spot.top + spot.height / 2 - 110));
    return { position: 'fixed', top, left: Math.min(spot.left + spot.width + 18, vp.w - TOOLTIP_W - 12), width: TOOLTIP_W };
  }

  if (side === 'bottom-left') {
    const right = Math.max(12, vp.w - (spot.left + spot.width));
    return { position: 'fixed', top: spot.top + spot.height + 14, right, width: TOOLTIP_W };
  }

  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_W };
}

// ─── Arrow component ──────────────────────────────────────────────────────────
const Arrow = ({ side, isDark }) => {
  const color = isDark ? '#171717' : '#ffffff';
  const border = isDark ? '#262626' : '#e5e7eb';

  if (side === 'right') {
    return (
      <span style={{
        position: 'absolute',
        left: -9,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: '9px solid transparent',
        borderBottom: '9px solid transparent',
        borderRight: `9px solid ${border}`,
        zIndex: 1,
      }}>
        <span style={{
          position: 'absolute',
          left: 2,
          top: -8,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: `8px solid ${color}`,
        }} />
      </span>
    );
  }

  if (side === 'bottom-left') {
    return (
      <span style={{
        position: 'absolute',
        top: -9,
        right: 20,
        width: 0,
        height: 0,
        borderLeft: '9px solid transparent',
        borderRight: '9px solid transparent',
        borderBottom: `9px solid ${border}`,
        zIndex: 1,
      }}>
        <span style={{
          position: 'absolute',
          top: 2,
          left: -8,
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: `8px solid ${color}`,
        }} />
      </span>
    );
  }

  return null;
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingTour() {
  const { user } = useAuth();
  const tourKey = `outsourcing_tour_v1_${user?._id || 'guest'}`;

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const rafRef = useRef(null);

  // Launch tour for first-time users
  useEffect(() => {
    if (!user?._id) return;
    if (localStorage.getItem(tourKey)) return;
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, [user?._id, tourKey]);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const current = STEPS[step];

  const recalc = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setSpot(measureTarget(current?.target));
    });
  }, [current]);

  useEffect(() => {
    if (!active) return;
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, recalc]);

  const finish = useCallback(() => {
    localStorage.setItem(tourKey, '1');
    setActive(false);
  }, [tourKey]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }, [step, finish]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  if (!active) return null;

  const ts = tooltipStyle(spot, current.side);
  const isCenter = !spot;
  const isLast = step === STEPS.length - 1;

  const cardBg = isDark ? '#171717' : '#ffffff';
  const cardBorder = isDark ? '#262626' : '#e5e7eb';

  return createPortal(
    <>
      {/* ── Spotlight backdrop ── */}
      {spot ? (
        <>
          <div style={{ position: 'fixed', inset: 0, top: 0, left: 0, right: 0, height: spot.top, background: 'rgba(0,0,0,0.65)', zIndex: 10000 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, top: spot.top + spot.height, bottom: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10000 }} />
          <div style={{ position: 'fixed', top: spot.top, left: 0, width: spot.left, height: spot.height, background: 'rgba(0,0,0,0.65)', zIndex: 10000 }} />
          <div style={{ position: 'fixed', top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height, background: 'rgba(0,0,0,0.65)', zIndex: 10000 }} />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10000 }} />
      )}

      {/* ── Spotlight ring ── */}
      {spot && (
        <div style={{
          position: 'fixed',
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          zIndex: 10001,
          borderRadius: 12,
          outline: '3px solid rgba(255,255,255,0.9)',
          outlineOffset: 2,
          pointerEvents: 'none',
          boxShadow: '0 0 0 4px rgba(99,102,241,0.35)',
        }} />
      )}

      {/* ── Tooltip card ── */}
      <div style={{
        ...ts,
        zIndex: 10002,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 16,
        padding: '20px 20px 16px',
        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
        position: ts.position,
      }}>
        {/* Arrow */}
        {!isCenter && current.side && <Arrow side={current.side} isDark={isDark} />}

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 5,
                borderRadius: 9999,
                transition: 'all 0.25s',
                background: i === step ? '#6366f1' : i < step ? '#a5b4fc' : isDark ? '#3f3f46' : '#e5e7eb',
                width: i === step ? 20 : 5,
              }} />
            ))}
          </div>
          <button
            onClick={finish}
            style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#71717a' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
          >
            Skip tour
          </button>
        </div>

        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#6366f110',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#6366f1' }}>{current.icon}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isDark ? '#f5f5f5' : '#111827', lineHeight: 1.3 }}>
            {current.title}
          </h3>
        </div>

        {/* Body */}
        <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6, color: isDark ? '#a3a3a3' : '#6b7280' }}>
          {current.body}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: isDark ? '#52525b' : '#9ca3af' }}>
            {step + 1} of {STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1px solid ${cardBorder}`,
                  background: 'none',
                  color: isDark ? '#d4d4d4' : '#374151',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                background: '#6366f1',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {isLast ? 'Get Started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
