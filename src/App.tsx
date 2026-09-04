import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { ImportRepo } from './components/ImportRepo';
import { LinkImport } from './components/LinkImport';
import { DeploymentProgress } from './components/DeploymentProgress';
import { getApiUrl } from './config/api';
 
import type { Repo } from './components/ImportRepo';

interface ActiveDeployment {
  id: string;
  repo: Repo;
  step: number;
  status: string;
  url?: string;
  error?: string;
  logs: string[];
  expiresAt?: string;
  detectedEnv?: {
    file: string;
    keys: string[];
    template?: string;
  };
}

function App() {
  const { user, loading, error, setError, login, logout } = useAuth();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [importedRepoIds, setImportedRepoIds] = useState<number[]>([]);

  // Fetch GitHub repos once authenticated
  useEffect(() => {
    if (!user) {
      setRepos([]);
      setImportedRepoIds([]);
      return;
    }

    const fetchRepos = async () => {
      setFetchingRepos(true);
      try {
        const token = localStorage.getItem('oauth_token');
        const apiUrl = getApiUrl();

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

  const [activeDeployment, setActiveDeployment] = useState<ActiveDeployment | null>(null);

  // Listen to real-time build & deployment progress via Server-Sent Events (SSE) with polling fallback
  useEffect(() => {
    if (!activeDeployment?.id || activeDeployment.step >= 4 || activeDeployment.step < 0) {
      return;
    }

    const apiUrl = getApiUrl();
    let isSubscribed = true;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`${apiUrl}/api/project/stream/${activeDeployment.id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setActiveDeployment((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              step: data.step !== undefined ? data.step : prev.step,
              status: data.status || prev.status,
              url: data.url !== undefined ? data.url : prev.url,
              error: data.error || prev.error,
              logs: data.logs || prev.logs,
              expiresAt: data.expiresAt || prev.expiresAt,
              detectedEnv: data.detectedEnv || prev.detectedEnv,
            };
          });

          if (data.step >= 4 || data.step < 0) {
            if (eventSource) eventSource.close();
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE connection closed or timed out, relying on polling:', err);
        if (eventSource) eventSource.close();
      };
    } catch (e) {
      console.warn('Could not initialize EventSource:', e);
    }

    // Polling fallback every 2.5s (vital for Vercel 10s serverless timeout)
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`${apiUrl}/api/project/status/${activeDeployment.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveDeployment((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              step: data.step !== undefined ? data.step : prev.step,
              status: data.status || prev.status,
              url: data.url !== undefined ? data.url : prev.url,
              error: data.error || prev.error,
              logs: data.logs && data.logs.length > (prev.logs?.length || 0) ? data.logs : prev.logs,
              expiresAt: data.expiresAt || prev.expiresAt,
              detectedEnv: data.detectedEnv || prev.detectedEnv,
            };
          });

          if (data.step >= 4 || data.step < 0) {
            clearInterval(pollInterval);
            if (eventSource) eventSource.close();
          }
        }
      } catch (pollErr) {
        console.error('Polling status error:', pollErr);
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, [activeDeployment?.id]);

  // When a repo is imported, start deployment in backend
  const handleImport = async (repo: Repo) => {
    setImportedRepoIds((prev) => [...prev, repo.id]);

    // Switch view to DeploymentProgress immediately
    setActiveDeployment({
      id: '',
      repo,
      step: 1,
      status: 'cloning',
      logs: [`[${new Date().toLocaleTimeString()}] Triggering build for ${repo.name}...`],
    });

    try {
      const token = localStorage.getItem('oauth_token');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/project/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repositoryUrl: repo.url,
          repoName: repo.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                id: data.deploymentId,
                logs: data.logs || prev.logs,
              }
            : null
        );
      } else {
        const errData = await res.json();
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                step: -1,
                error: errData.error || 'Failed to start deployment',
                logs: [...prev.logs, `❌ Server error: ${errData.error || 'Failed'}`],
              }
            : null
        );
      }
    } catch (err: any) {
      setActiveDeployment((prev) =>
        prev
          ? {
              ...prev,
              step: -1,
              error: err.message || 'Could not connect to deployment server',
              logs: [...prev.logs, `❌ Connection error: ${err.message}`],
            }
          : null
      );
    }
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

  const handleStopDeployment = async () => {
    if (!activeDeployment?.id) return;
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/project/stop/${activeDeployment.id}`, {
        method: 'POST',
      });
      setActiveDeployment((prev) =>
        prev
          ? {
              ...prev,
              step: -99,
              status: 'stopped',
              url: undefined,
              logs: [...prev.logs, '🛑 Sandbox stopped and files deleted from VM disk.'],
            }
          : null
      );
    } catch (e: any) {
      console.error('Failed to stop sandbox:', e);
    }
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
            maxWidth: '1280px',
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
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '40px 24px',
            boxSizing: 'border-box',
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

              {activeDeployment ? (
                <DeploymentProgress
                  repo={activeDeployment.repo}
                  step={activeDeployment.step}
                  status={activeDeployment.status}
                  url={activeDeployment.url}
                  logs={activeDeployment.logs}
                  error={activeDeployment.error}
                  expiresAt={activeDeployment.expiresAt}
                  detectedEnv={activeDeployment.detectedEnv}
                  onBack={() => setActiveDeployment(null)}
                  onStop={handleStopDeployment}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 320px',
                    gap: '24px',
                    alignItems: 'start',
                  }}
                >
                  <ImportRepo
                    user={user}
                    repos={repos.filter((r) => !importedRepoIds.includes(r.id))}
                    fetchingRepos={fetchingRepos}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onImport={handleImport}
                  />

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
