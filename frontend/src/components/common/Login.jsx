import { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      let userRole = 'hr';
      if (email.toLowerCase().includes('ceo')) {
        userRole = 'ceo';
      } else if (email.toLowerCase().includes('admin')) {
        userRole = 'admin';
      } else if (email.toLowerCase().includes('manager')) {
        userRole = 'manager';
      } else if (email.toLowerCase().includes('it')) {
        userRole = 'it';
      } else if (email.toLowerCase().includes('finance')) {
        userRole = 'finance';
      } else if (email.toLowerCase().includes('hr')) {
        userRole = 'hr';
      }

      onLogin(userRole);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background-light px-4 py-8 font-display text-text-light dark:bg-background-dark dark:text-text-dark">
      <div className="absolute -top-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl"></div>
      <div className="absolute -bottom-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-3xl"></div>
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-2xl shadow-slate-200/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-card-dark/70 dark:shadow-black/60 md:grid-cols-2">
        <div className="hidden items-center justify-center bg-slate-50 p-8 dark:bg-slate-900/50 md:flex">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-5xl">security</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Admin Portal Access</h2>
            <p className="mt-2 text-sm text-subtext-light dark:text-subtext-dark">
              Manage your organization with enterprise-grade security.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase text-primary">Super Admin Portal</p>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-subtext-light dark:text-subtext-dark">Sign in to continue to your workspace.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                <a href="#" className="text-primary hover:text-primary-hover">
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
              className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-lg shadow-primary/40 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/50"
            >
              Sign In
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-subtext-light dark:text-subtext-dark">
            © 2025 CitiMart-HouseofMusa. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
