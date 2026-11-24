import { useAuth } from '../../context/AuthContext';

export default function AccessDenied() {
  const { logout } = useAuth();
  return <main className="flex min-h-screen items-center justify-center p-6">
    <div className="max-w-md text-center">
      <h1 className="text-2xl font-semibold">Workspace access unavailable</h1>
      <p className="mt-3 text-sm text-neutral-500">Your account has no available workspace. Contact your administrator to review your role and portal access.</p>
      <button onClick={logout} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-white">Sign out</button>
    </div>
  </main>;
}
