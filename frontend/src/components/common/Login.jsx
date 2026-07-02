import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
      return '/manager/dashboard';
    case 'it':
      return '/it/dashboard';
    case 'finance':
      return '/finance/dashboard';
    case 'employee':
      return Array.isArray(assignedProjects) && assignedProjects.length > 0 ? '/employee/projects' : '/employee/dashboard';
    case 'hr':
    default:
      return '/hr/dashboard';
  }
};

const Login = ({ roleFocus = null, loginMode = 'default' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password || submitting) return;

    const redirectTo = location.state?.from;

    (async () => {
      try {
        setSubmitting(true);
        setError(null);
        const authedUser = await login(email, password, loginMode);
        const targetPath = redirectTo || defaultRolePath(authedUser.role, authedUser.metadata || {}, authedUser.department || '');
        navigate(targetPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const heroTitle =
    roleFocus === 'manager' ? 'Operations Portal Access' : loginMode === 'outsourcing' ? 'Outsourcing Portal Access' : 'Super Admin Portal';
  const heroSubtitle =
    roleFocus === 'manager'
      ? 'Coordinate projects, monitor teams, and review live metrics.'
      : 'Manage your organization with enterprise-grade security.';
  const welcomeTitle = roleFocus === 'manager' ? 'Sign In' : loginMode === 'outsourcing' ? 'Outsourcing Sign In' : 'Welcome Back';
  const welcomeSubtitle =
    roleFocus === 'manager'
      ? 'Sign in to manage projects, teams, and operational workflows.'
      : 'Sign in to continue to your workspace.';
  const productLabel = roleFocus === 'manager' ? 'Operations Workspace' : loginMode === 'outsourcing' ? 'Freelancer Workspace' : 'Your Work Portal';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background-light px-4 py-8 font-display text-text-light dark:bg-background-dark dark:text-text-dark">
      <div className="absolute -top-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-3xl"></div>
      <div className="absolute -bottom-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl"></div>
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-gradient-to-r from-primary/35 via-blue-400/30 to-emerald-400/30 blur-3xl opacity-90 dark:from-primary/40 dark:via-blue-400/35 dark:to-emerald-400/35"></div>
      </div>
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-2xl shadow-slate-300/30 backdrop-blur-xl ring-1 ring-slate-200/70 dark:border-slate-800/80 dark:bg-card-dark/70 dark:shadow-black/30 dark:ring-slate-700/60 md:grid-cols-2">
        <div className="hidden items-center justify-center border-r border-slate-200/80 bg-slate-50/70 p-10 dark:border-slate-800 dark:bg-slate-900/60 md:flex">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 h-40 w-40 overflow-hidden rounded-3xl border border-white/80 bg-white/60 shadow-xl shadow-primary/20">
              <img
                src="/citimart-logo.jpg"
                alt="CittiMart"
                className="h-full w-full object-cover"
              />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight">{heroTitle}</h2>
            <p className="mt-2 text-sm text-subtext-light dark:text-subtext-dark">{heroSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{productLabel}</p>
            <h1 className="text-3xl font-bold tracking-tight">{welcomeTitle}</h1>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">{welcomeSubtitle}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Email Address</span>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-subtext-light dark:text-subtext-dark">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-text-light placeholder:text-subtext-light transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/50 dark:text-text-dark dark:placeholder:text-subtext-dark"
                  placeholder="you@gmail.com"
                  required
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Password</span>
                <a href="/forgot-password" className="text-primary hover:text-primary-hover">
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-subtext-light dark:text-subtext-dark">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-text-light placeholder:text-subtext-light transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/50 dark:text-text-dark dark:placeholder:text-subtext-dark"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="material-symbols-outlined absolute right-3 text-subtext-light hover:text-text-light dark:text-subtext-dark dark:hover:text-text-dark"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
            </label>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-3 text-subtext-light dark:text-subtext-dark">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40 dark:border-slate-600"
                />
                Remember me
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/35 transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-subtext-light dark:text-subtext-dark">
            © 2026 CitiMart - HouseofMusa. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
