import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { ImportRepo } from './components/ImportRepo';
import { LinkImport } from './components/LinkImport';
import { DeploymentProgress } from './components/DeploymentProgress';
import type { Repo } from './components/ImportRepo';

function App() {
  const { user, loading, error, setError, login, logout } = useAuth();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [deployingRepo, setDeployingRepo] = useState<Repo | null>(null);
  const [deployStep, setDeployStep] = useState<number>(0);

  // Fetch GitHub repos once authenticated
  useEffect(() => {
    if (!user) {
      setRepos([]);
      setDeployingRepo(null);
      setDeployStep(0);
      return;
    }

    const fetchRepos = async () => {
      setFetchingRepos(true);
      try {
        const token = localStorage.getItem('oauth_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        // --- Stage 1: Try our backend proxy ---
        let data: Repo[] | null = null;
        try {
          const response = await fetch(`${apiUrl}/api/github/repos`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            data = (await response.json()) as Repo[];
          }
        } catch {
          // backend unreachable or route missing — fall through to Stage 2
        }

        // --- Stage 2: Direct GitHub API fallback ---
        // The backend JWT embeds the GitHub token in its payload (base64 middle segment).
        // Decode it so we can call GitHub directly even if our backend is stale.
        if (!data && token) {
          try {
            const payloadBase64 = token.split('.')[1];
            const decoded = JSON.parse(atob(payloadBase64)) as {
              githubToken?: string;
            };
            const githubToken = decoded.githubToken;

            if (githubToken) {
              const ghRes = await fetch(
                'https://api.github.com/user/repos?sort=updated&per_page=100',
                {
                  headers: {
                    Authorization: `Bearer ${githubToken}`,
                    'User-Agent': 'mini-vercel-sandbox-frontend',
                    Accept: 'application/vnd.github+json',
                  },
                }
              );
              if (ghRes.ok) {
                const ghRepos = (await ghRes.json()) as Array<{
                  id: number;
                  name: string;
                  full_name: string;
                  private: boolean;
                  html_url: string;
                  description: string | null;
                  updated_at: string;
                }>;
                data = ghRepos.map((r) => ({
                  id: r.id,
                  name: r.name,
                  fullName: r.full_name,
                  isPrivate: r.private,
                  url: r.html_url,
                  description: r.description,
                  updatedAt: r.updated_at,
                }));
              }
            }
          } catch (decodeErr) {
            console.error('GitHub direct fallback failed:', decodeErr);
          }
        }

        if (data) setRepos(data);
      } catch (err) {
        console.error('Fetch repos failed entirely:', err);
      } finally {
        setFetchingRepos(false);
      }
    };

    fetchRepos();
  }, [user]);

  // Simulate Vercel-style staged deployment
  const handleImport = (repo: Repo) => {
    setDeployingRepo(repo);
    setDeployStep(1);
    setTimeout(() => {
      setDeployStep(2);
      setTimeout(() => {
        setDeployStep(3);
        setTimeout(() => setDeployStep(4), 2000);
      }, 2000);
    }, 1500);
  };

  const handleCustomImport = () => {
    if (!customRepoUrl.trim()) return;
    const parts = customRepoUrl.trim().split('/');
    const repoName = parts[parts.length - 1] || 'custom-repo';
    const mockRepo: Repo = {
      id: Math.floor(Math.random() * 100000),
      name: repoName,
      fullName: repoName,
      isPrivate: false,
      url: customRepoUrl,
      description: 'Third-party repository import',
      updatedAt: new Date().toISOString(),
    };
    handleImport(mockRepo);
  };

  const handleBack = () => {
    setDeployingRepo(null);
    setDeployStep(0);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#e4e4e4',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <Navbar user={user} onLogin={login} onLogout={logout} />

      {/* Error banner */}
      {error && (
        <div
          style={{
            maxWidth: '900px',
            margin: '16px auto',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#f87171',
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 64px)',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '2px solid #222',
              borderTopColor: '#fff',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
            Completing GitHub authentication…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <main
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Profile bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  paddingBottom: '24px',
                  borderBottom: '1px solid #1a1a1a',
                }}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid #2a2a2a',
                  }}
                />
                <div>
                  <h2
                    style={{
                      fontSize: '17px',
                      fontWeight: '700',
                      color: '#fff',
                      margin: 0,
                    }}
                  >
                    {user.name}'s Workspace
                  </h2>
                  {user.email && (
                    <p style={{ fontSize: '12px', color: '#555', margin: '2px 0 0 0' }}>
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              {deployingRepo ? (
                /* Deployment progress view */
                <DeploymentProgress
                  repo={deployingRepo}
                  step={deployStep}
                  onBack={handleBack}
                />
              ) : (
                /* Two-column import layout */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 320px',
                    gap: '24px',
                    alignItems: 'start',
                  }}
                >
                  {/* Left: GitHub repo list */}
                  <ImportRepo
                    user={user}
                    repos={repos}
                    fetchingRepos={fetchingRepos}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onImport={handleImport}
                  />

                  {/* Right: third-party URL import */}
                  <LinkImport
                    customRepoUrl={customRepoUrl}
                    onUrlChange={setCustomRepoUrl}
                    onImport={handleCustomImport}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Logged-out hero */
            <div style={{ textAlign: 'center', paddingTop: '80px' }}>
              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  color: '#fff',
                  margin: '0 0 16px 0',
                  letterSpacing: '-1.5px',
                  lineHeight: '1.1',
                }}
              >
                Deploy with confidence.
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: '#555',
                  maxWidth: '460px',
                  margin: '0 auto 40px auto',
                  lineHeight: '1.7',
                }}
              >
                Connect your GitHub account to deploy, run sandboxes, and manage your
                repositories in a secure isolated environment.
              </p>
              <button
                onClick={login}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = '#e5e5e5')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = '#fff')
                }
                onMouseDown={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)')
                }
                onMouseUp={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
                }
              >
                {/* GitHub icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue with GitHub
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
