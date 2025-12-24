import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const defaultRolePath = (role) => {
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
      return '/employee/dashboard';
    case 'hr':
    default:
      return '/hr/dashboard';
  }
};

const Login = ({ roleFocus = null }) => {
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
        const authedUser = await login(email, password);
        const targetPath = redirectTo || defaultRolePath(authedUser.role);
        navigate(targetPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const heroTitle = roleFocus === 'manager' ? 'Manager Portal Access' : 'Admin Portal Access';
  const heroSubtitle =
    roleFocus === 'manager'
      ? 'Lead your teams with live insights and collaboration.'
      : 'Manage your organization with enterprise-grade security.';
  const welcomeTitle = roleFocus === 'manager' ? 'Manager Sign In' : 'Welcome Back';
  const welcomeSubtitle =
    roleFocus === 'manager'
      ? 'Sign in to orchestrate projects, monitor teams, and review live metrics.'
      : 'Sign in to continue to your workspace.';
  const productLabel = roleFocus === 'manager' ? 'Manager Workspace' : 'Super Admin Portal';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background-light px-4 py-8 font-display text-text-light dark:bg-background-dark dark:text-text-dark">
      <div className="absolute -top-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl"></div>
      <div className="absolute -bottom-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-3xl"></div>
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-gradient-to-r from-primary/40 via-purple-500/50 via-indigo-400/40 to-sky-400/40 blur-3xl opacity-80 dark:from-primary/50 dark:via-purple-500/60 dark:via-indigo-400/50 dark:to-sky-400/50"></div>
      </div>
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-2xl shadow-purple-500/50 backdrop-blur-xl ring-1 ring-purple-500/20 ring-offset-4 ring-offset-transparent dark:border-slate-800/80 dark:bg-card-dark/70 dark:shadow-purple-500/40 dark:ring-purple-500/30 md:grid-cols-2" style={{boxShadow: '0 0 30px rgba(168, 85, 247, 0.3), 0 0 60px rgba(168, 85, 247, 0.1)'}}>
        <div className="hidden items-center justify-center bg-slate-50 p-8 dark:bg-slate-900/50 md:flex">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-5xl">security</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold">{heroTitle}</h2>
            <p className="mt-2 text-sm text-subtext-light dark:text-subtext-dark">{heroSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase text-primary">{productLabel}</p>
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
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-text-light placeholder:text-subtext-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/50 dark:text-text-dark dark:placeholder:text-subtext-dark"
                  placeholder="you@example.com"
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
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-11 pr-12 text-sm text-text-light placeholder:text-subtext-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900/50 dark:text-text-dark dark:placeholder:text-subtext-dark"
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
              className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-lg shadow-primary/40 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-subtext-light dark:text-subtext-dark">
            © 2025 CitiMart - HouseofMusa. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
