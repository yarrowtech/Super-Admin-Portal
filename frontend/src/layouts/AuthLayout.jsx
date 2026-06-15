const AuthLayout = ({ children }) => (
  <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
    <div className="w-full max-w-md">{children}</div>
  </main>
);

export default AuthLayout;
