import { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple validation - in real app, this would call an API
    if (email && password) {
      console.log('Login successful:', { email, password, rememberMe });
      onLogin();
    } else {
      alert('Please enter both email and password');
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col font-display text-[#111318] dark:text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-background-dark dark:via-gray-900 dark:to-slate-900"></div>
      <div className="relative layout-container flex h-full grow flex-col">
        <main className="flex min-h-screen w-full items-center justify-center p-4 md:p-8">
          <div className="flex w-full max-w-lg flex-col items-center">
            <div className="flex flex-col items-center gap-4 mb-10 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full">
                <span className="material-symbols-outlined text-primary text-4xl">
                  admin_panel_settings
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[#111318] dark:text-white tracking-tight text-3xl sm:text-4xl font-bold">Admin Portal</p>
                <p className="text-[#616f89] dark:text-gray-400 text-base font-normal">Securely access your dashboard.</p>
              </div>
            </div>
            <div className="w-full bg-white dark:bg-gray-800/50 p-8 sm:p-10 rounded-xl shadow-2xl shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-sm border border-slate-200/50 dark:border-gray-700/50">
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <label className="flex flex-col w-full">
                  <p className="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal pb-2">Email Address</p>
                  <div className="relative flex w-full flex-1 items-stretch">
                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2">mail</span>
                    <input 
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111318] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 border border-[#dbdfe6] dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:border-primary dark:focus:border-primary h-12 placeholder:text-[#616f89] dark:placeholder:text-gray-500 pl-12 pr-4 py-2 text-base font-normal leading-normal" 
                      placeholder="you@example.com" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </label>
                <label className="flex flex-col w-full">
                  <div className="flex justify-between items-center pb-2">
                    <p className="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal">Password</p>
                    <a className="text-sm font-medium text-primary hover:underline" href="#">Forgot?</a>
                  </div>
                  <div className="relative flex w-full flex-1 items-stretch">
                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2">lock</span>
                    <input 
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111318] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 border border-[#dbdfe6] dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:border-primary dark:focus:border-primary h-12 placeholder:text-[#616f89] dark:placeholder:text-gray-500 pl-12 pr-12 py-2 text-base font-normal leading-normal" 
                      placeholder="Enter your password" 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      className="absolute right-0 top-0 h-full px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <input 
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-primary focus:ring-2 focus:ring-primary/50" 
                    id="remember-me" 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="text-[#111318] dark:text-gray-200 text-sm font-normal cursor-pointer" htmlFor="remember-me">
                    Keep me logged in
                  </label>
                </div>
                <button 
                  className="flex items-center justify-center w-full h-12 px-6 py-3 mt-4 text-base font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-background-dark"
                  type="submit"
                >
                  Sign In
                </button>
              </form>
            </div>
            <div className="mt-12 text-center">
              <p className="text-xs text-[#616f89] dark:text-gray-500">© 2024 AdminCorp. All Rights Reserved.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;