import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import yarrowtechLogo from '../../assets/yt-whatsapp-dp.png';

const defaultRolePath = (role, userMeta = {}, department = '') => {
  const type = String(userMeta?.outsourcingType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const normalizedDepartment = String(department || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');
  const assignedProjects = userMeta.projectAssignments ?? userMeta.assignedProjects ?? [];
  if (
    role === 'freelancer' ||
    normalizedDepartment === 'outsourcing' ||
    normalizedDepartment === 'outsource' ||
    normalizedDepartment === 'external_workforce' ||
    type === 'third_party_worker' ||
    type === '3rd_party_worker' ||
    type === 'thirdpartyworker' ||
    type === 'freelancer' ||
    type === 'freelaner'
  ) {
    return '/outsourcing/dashboard';
  }
  switch (role) {
    case 'ceo':
      return '/ceo/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
    case 'it_manager':
      return '/manager/dashboard';
    case 'it':
    case 'it_admin':
      return '/it/dashboard';
    case 'it_employee':
      return Array.isArray(assignedProjects) && assignedProjects.length > 0 ? '/employee/projects' : '/employee/dashboard';
    case 'it_hr':
      return '/hr/dashboard';
    case 'finance':
      return '/finance/dashboard';
    case 'media':
    case 'media_marketing':
    case 'marketing_head':
    case 'media_manager':
    case 'content_writer':
    case 'graphic_designer':
    case 'video_editor':
    case 'seo_specialist':
    case 'social_media_manager':
    case 'ads_manager':
    case 'project_manager':
    case 'department_head':
    case 'client_viewer':
      return '/media/dashboard';
    case 'media_head':
      return '/media/head/dashboard';
    case 'sales':
    case 'media_sales':
      return '/media/sales/dashboard';
    case 'employee':
      return Array.isArray(assignedProjects) && assignedProjects.length > 0 ? '/employee/projects' : '/employee/dashboard';
    case 'hr':
    default:
      return '/hr/dashboard';
  }
};

const EyeIcon = ({ hidden = false }) =>
  hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3L21 21" />
      <path d="M10.6 10.6A2 2 0 0013.4 13.4" />
      <path d="M9.9 4.2A10.8 10.8 0 0112 4C17 4 20.5 8 21 12C20.7 14.3 19.2 16.6 17.2 18.1" />
      <path d="M6.1 6.1C4.3 7.5 3.2 9.5 3 12C3.5 16 7 20 12 20C13.5 20 14.9 19.6 16.1 19" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const AlertIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12" />
    <path d="M12 16H12.01" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <path
      fill="#4285F4"
      d="M21.35 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h5.24a4.48 4.48 0 01-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42z"
    />
    <path
      fill="#34A853"
      d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0012 21.6z"
    />
    <path
      fill="#FBBC05"
      d="M6.53 13.68A5.86 5.86 0 016.23 12c0-.58.1-1.15.3-1.68V7.79H3.28A9.6 9.6 0 002.25 12c0 1.52.36 2.95 1.03 4.21l3.25-2.53z"
    />
    <path
      fill="#EA4335"
      d="M12 6.29c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.39 14.63 2.4 12 2.4a9.74 9.74 0 00-8.72 5.39l3.25 2.53C7.3 8.01 9.46 6.29 12 6.29z"
    />
  </svg>
);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const Login = ({ roleFocus = null, loginMode = 'default' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const validateField = (name, value) => {
    if (name === 'email') {
      const nextEmail = value.trim();
      if (!nextEmail) return 'Email address is required.';
      if (!isValidEmail(nextEmail)) return 'Enter a valid email address.';
    }

    if (name === 'password' && !value) {
      return 'Password is required.';
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
    };
    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateFieldError = (fieldName, value) => {
    const message = validateField(fieldName, value);
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) next[fieldName] = message;
      else delete next[fieldName];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (submitting || !validateForm()) {
      return;
    }

    const redirectTo = location.state?.from;

    (async () => {
      try {
        setSubmitting(true);
        const authedUser = await login(email, password, loginMode);
        const targetPath = redirectTo || defaultRolePath(authedUser.role, authedUser.metadata || {}, authedUser.department || '');
        navigate(targetPath, { replace: true });
      } catch (err) {
        const status = err?.status || err?.response?.status;
        setError(status === 401 || status === 403 ? 'Invalid email or password.' : 'Unable to sign in. Please try again.');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const closeLogin = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const portalHint =
    roleFocus === 'manager'
      ? 'Operations Access'
      : loginMode === 'outsourcing'
        ? 'Outsourcing Access'
        : '';
  const emailError = fieldErrors.email;
  const passwordError = fieldErrors.password;

  return (
    <main className="min-h-[100svh] w-full overflow-x-hidden bg-[#9b5a29] font-display text-[#2a2118]">
      <style>{`
        .yarrow-login-input:-webkit-autofill,
        .yarrow-login-input:-webkit-autofill:hover,
        .yarrow-login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #2a2118;
          box-shadow: 0 0 0 1000px #ffffff inset;
          caret-color: #2a2118;
          transition: background-color 9999s ease-out 0s;
        }

        @media (prefers-reduced-motion: reduce) {
          .yarrow-login-motion {
            animation: none !important;
            transition-duration: 1ms !important;
          }
        }
      `}</style>

      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-3.5 py-5 sm:px-6 sm:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,224,177,0.34),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(142,71,26,0.36),transparent_24%),linear-gradient(135deg,#b87434_0%,#8f4c24_45%,#6d351e_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-black/28 backdrop-blur-[2px]" />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          className="yarrow-login-motion relative w-[calc(100%-28px)] max-w-[440px] animate-slide-up rounded-[20px] border border-[#efe7dc] bg-white px-6 pb-7 pt-5 shadow-[0_24px_60px_rgba(69,36,16,0.36)] sm:px-9 sm:pb-9 sm:pt-6"
        >
          <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#e58b2f] via-[#d79532] to-[#bd6a22]" />
          <button
            type="button"
            onClick={closeLogin}
            aria-label="Close login"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-[#eadfd1] bg-[#fbf7f1] text-lg leading-none text-[#8a8075] transition hover:bg-[#f1e7da] hover:text-[#4b3a2c] focus:outline-none focus:ring-2 focus:ring-[#d8892e]/35"
          >
            &times;
          </button>

          <div className="mb-5 mt-7 flex justify-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#f0e6d7] bg-[#fffaf4] p-2 shadow-[0_10px_24px_rgba(125,72,29,0.13)]">
              <img src={yarrowtechLogo} alt="YarrowTech" className="h-full w-full object-contain" />
            </div>
          </div>

          <header className="mb-7 text-center">
            <h1 id="login-title" className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.2px] text-[#2d2118]">
              Log in
            </h1>
            <div className="mt-3 text-[13px] font-medium leading-5 text-[#8b8075]">
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                onClick={() => setError('Please contact your administrator to create an account.')}
                className="ml-1 font-extrabold text-[#d77a25] underline-offset-4 transition hover:text-[#b85f18] hover:underline focus:outline-none focus:ring-2 focus:ring-[#d8892e]/30"
              >
                Create Account
              </button>
            </div>
            {portalHint && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[1.4px] text-[#b89461]">{portalHint}</p>
            )}
          </header>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-[#f1cfc2] bg-[#fff8f3] px-3.5 py-3 text-xs font-semibold text-[#9a3b24]"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="mb-2 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#58483a]">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                  if (fieldErrors.email) updateFieldError('email', e.target.value);
                }}
                onBlur={(e) => updateFieldError('email', e.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`yarrow-login-input h-[50px] w-full rounded-full border bg-white px-5 text-[14px] font-semibold text-[#2a2118] outline-none transition placeholder:font-medium placeholder:text-[#aaa29b] hover:border-[#d4c8bc] focus:border-[#d8892e] ${
                  emailError ? 'border-[#dc8b83]' : 'border-[#e4ddd5]'
                }`}
              />
              {emailError && (
                <p id="email-error" className="mt-2 text-xs font-semibold text-[#a43b31]">
                  {emailError}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="mb-2 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#58483a]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                    if (fieldErrors.password) updateFieldError('password', e.target.value);
                  }}
                  onBlur={(e) => updateFieldError('password', e.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={`yarrow-login-input h-[50px] w-full rounded-full border bg-white pl-5 pr-12 text-[14px] font-semibold text-[#2a2118] outline-none transition placeholder:font-medium placeholder:text-[#aaa29b] hover:border-[#d4c8bc] focus:border-[#d8892e] ${
                    passwordError ? 'border-[#dc8b83]' : 'border-[#e4ddd5]'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-0 bg-transparent text-[#8f857b] transition hover:bg-[#f7eee5] hover:text-[#c06a1f] focus:outline-none focus:ring-2 focus:ring-[#d8892e]/35"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="h-[18px] w-[18px]">
                    <EyeIcon hidden={showPassword} />
                  </span>
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="mt-2 text-xs font-semibold text-[#a43b31]">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="mb-5 flex justify-end">
              <a href="/forgot-password" className="text-[12px] font-extrabold text-[#d77a25] underline-offset-4 transition hover:text-[#b85f18] hover:underline focus:outline-none focus:ring-2 focus:ring-[#d8892e]/30">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-r from-[#e1842b] to-[#d06c1e] text-[14px] font-extrabold text-white shadow-[0_12px_22px_rgba(211,111,30,0.28)] transition hover:-translate-y-0.5 hover:from-[#d97822] hover:to-[#bd5f19] hover:shadow-[0_16px_28px_rgba(211,111,30,0.34)] focus:outline-none focus:ring-4 focus:ring-[#d8892e]/28 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#ebe4dc]" />
            <p className="m-0 whitespace-nowrap text-[11px] font-extrabold tracking-[1.1px] text-[#a59a8f]">OR</p>
            <span className="h-px flex-1 bg-[#ebe4dc]" />
          </div>

          <button
            type="button"
            disabled
            title="Google authentication is not connected yet"
            className="relative flex h-[50px] w-full cursor-not-allowed items-center justify-center rounded-full border border-[#e2dbd3] bg-white px-5 text-[14px] font-bold text-[#3a3028] opacity-75 transition"
          >
            <span className="absolute left-5">
              <GoogleIcon />
            </span>
            Sign in with Google
          </button>
        </div>
      </section>
    </main>
  );
};

export default Login;
