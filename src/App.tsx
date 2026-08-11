import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';

function App() {
  const { user, loading, error, setError, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navbar user={user} onLogin={login} onLogout={logout} />

      {error && (
        <div className="mx-auto mt-6 max-w-4xl px-6">
          <div className="rounded-lg bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-white"></div>
          <p className="mt-4 text-sm text-zinc-400 font-medium">Completing GitHub authentication...</p>
        </div>
      ) : (
        <main className="mx-auto max-w-4xl px-6 py-16">
          {user ? (
            /* Logged In Dashboard View */
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/80">
              <div className="flex items-center gap-4">
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="h-16 w-16 rounded-full border border-zinc-700"
                />
                <div>
                  <h2 className="text-xl font-bold text-white">Welcome back, {user.name}!</h2>
                  <p className="text-sm text-zinc-400">
                    Logged in as <a href={user.profileUrl} target="_blank" rel="noreferrer" className="text-zinc-300 underline hover:text-white">@{user.username}</a>
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-zinc-800 pt-6">
                <h3 className="text-md font-semibold text-white">Your Workspace</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  You are successfully authenticated. You can now access secure APIs and manage your deployment workflows.
                </p>
                
                {/* Deployment Mock Area */}
                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
                  <h4 className="text-sm font-semibold text-zinc-300">Create a New Project</h4>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input 
                      type="text" 
                      placeholder="https://github.com/username/repo" 
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    />
                    <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-zinc-200 active:scale-95">
                      Import Repository
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Logged Out Hero View */
            <div className="text-center py-12">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Deploy with confidence.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base text-zinc-400 leading-relaxed">
                Connect your GitHub account to deploy, run sandboxes, and manage your repositories in our secure isolated environment.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <button
                  onClick={login}
                  className="rounded-lg bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:bg-white active:scale-95"
                >
                  Get Started (Login with GitHub)
                </button>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
