import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { ImportRepo } from './components/ImportRepo';
import { LinkImport } from './components/LinkImport';
import { DeploymentProgress } from './components/DeploymentProgress';
import { FolderUpload } from './components/FolderUpload';
import { LiveWebsitesTab } from './components/LiveWebsitesTab';
import { getApiUrl } from './config/api';

import type { Repo } from './components/ImportRepo';
import type { UploadedFilePayload } from './components/FolderUpload';
import type { SandboxItem } from './components/LiveWebsitesTab';

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

  // Navigation tabs
  const [mainTab, setMainTab] = useState<'deploy' | 'live'>('deploy');
  const [deployMode, setDeployMode] = useState<'git' | 'folder'>('git');

  // Sandboxes list (persisted in localStorage + fetched from backend/worker)
  const [sandboxes, setSandboxes] = useState<SandboxItem[]>(() => {
    try {
      const saved = localStorage.getItem('mini_vercel_sandboxes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [fetchingSandboxes, setFetchingSandboxes] = useState(false);

  const fetchSandboxes = async () => {
    setFetchingSandboxes(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/project/sandboxes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sandboxes)) {
          setSandboxes(data.sandboxes);
          localStorage.setItem('mini_vercel_sandboxes', JSON.stringify(data.sandboxes));
        }
      }
    } catch (e) {
      console.error('Failed to fetch sandboxes:', e);
    } finally {
      setFetchingSandboxes(false);
    }
  };

  useEffect(() => {
    fetchSandboxes();
  }, []);

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
  const [isUploading, setIsUploading] = useState(false);

  // Listen to real-time build & deployment progress via Server-Sent Events (SSE) with polling fallback
  useEffect(() => {
    if (!activeDeployment?.id || activeDeployment.step >= 4 || activeDeployment.step < 0) {
      return;
    }

    const apiUrl = getApiUrl();
    let isSubscribed = true;
    let eventSource: EventSource | null = null;

    const handleUpdateData = (data: any) => {
      setActiveDeployment((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          step: data.step !== undefined ? data.step : prev.step,
          status: data.status || prev.status,
          url: data.url !== undefined ? data.url : prev.url,
          error: data.error || prev.error,
          logs: data.logs && data.logs.length > (prev.logs?.length || 0) ? data.logs : (data.logs || prev.logs),
          expiresAt: data.expiresAt || prev.expiresAt,
          detectedEnv: data.detectedEnv || prev.detectedEnv,
        };
      });

      // Update sandboxes state if live
      if (data.status === 'live' || data.url) {
        setSandboxes((prev) => {
          const exists = prev.some((s) => s.id === activeDeployment.id);
          const updated = exists
            ? prev.map((s) =>
                s.id === activeDeployment.id
                  ? { ...s, status: data.status, url: data.url, expiresAt: data.expiresAt }
                  : s
              )
            : [
                {
                  id: activeDeployment.id,
                  repoName: activeDeployment.repo.name,
                  repoUrl: activeDeployment.repo.url,
                  isUpload: activeDeployment.repo.url === 'local-upload',
                  status: data.status || 'live',
                  step: data.step || 4,
                  url: data.url,
                  port: data.port,
                  createdAt: new Date().toISOString(),
                  expiresAt: data.expiresAt,
                  detectedEnv: data.detectedEnv,
                },
                ...prev,
              ];
          localStorage.setItem('mini_vercel_sandboxes', JSON.stringify(updated));
          return updated;
        });
      }
    };

    try {
      eventSource = new EventSource(`${apiUrl}/api/project/stream/${activeDeployment.id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleUpdateData(data);

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
          handleUpdateData(data);

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

  // When a repo is imported from Git
  const handleImport = async (repo: Repo) => {
    setImportedRepoIds((prev) => [...prev, repo.id]);

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

        // Pre-insert into sandboxes list
        const newSandbox: SandboxItem = {
          id: data.deploymentId,
          repoName: repo.name,
          repoUrl: repo.url,
          isUpload: false,
          status: 'cloning',
          step: 1,
          createdAt: new Date().toISOString(),
        };
        setSandboxes((prev) => {
          const updated = [newSandbox, ...prev.filter((s) => s.id !== data.deploymentId)];
          localStorage.setItem('mini_vercel_sandboxes', JSON.stringify(updated));
          return updated;
        });
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

  // Deploy from uploaded files (Folder or ZIP)
  const handleDeployFiles = async (
    repoName: string,
    files: UploadedFilePayload[],
    envVars?: string
  ) => {
    setIsUploading(true);

    const mockRepo: Repo = {
      id: Date.now(),
      name: repoName,
      fullName: repoName,
      isPrivate: false,
      url: 'local-upload',
      description: `Uploaded files package (${files.length} files)`,
      updatedAt: new Date().toISOString(),
    };

    setActiveDeployment({
      id: '',
      repo: mockRepo,
      step: 1,
      status: 'unpacking',
      logs: [
        `[${new Date().toLocaleTimeString()}] Uploading ${files.length} project files to VM worker...`,
      ],
    });

    try {
      const token = localStorage.getItem('oauth_token');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/project/upload-deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repoName,
          files,
          envVars,
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

        // Pre-insert into sandboxes list
        const newSandbox: SandboxItem = {
          id: data.deploymentId,
          repoName,
          isUpload: true,
          status: 'unpacking',
          step: 1,
          createdAt: new Date().toISOString(),
        };
        setSandboxes((prev) => {
          const updated = [newSandbox, ...prev.filter((s) => s.id !== data.deploymentId)];
          localStorage.setItem('mini_vercel_sandboxes', JSON.stringify(updated));
          return updated;
        });
      } else {
        const errData = await res.json();
        setActiveDeployment((prev) =>
          prev
            ? {
                ...prev,
                step: -1,
                error: errData.error || 'Failed to start file deployment',
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
    } finally {
      setIsUploading(false);
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
      setSandboxes((prev) =>
        prev.map((s) =>
          s.id === activeDeployment.id ? { ...s, status: 'stopped', url: null } : s
        )
      );
    } catch (e: any) {
      console.error('Failed to stop sandbox:', e);
    }
  };

  const handleStopSandboxFromTab = async (id: string) => {
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/project/stop/${id}`, { method: 'POST' });
      setSandboxes((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...s, status: 'stopped', url: null } : s
        );
        localStorage.setItem('mini_vercel_sandboxes', JSON.stringify(updated));
        return updated;
      });
      if (activeDeployment?.id === id) {
        setActiveDeployment((prev) =>
          prev ? { ...prev, step: -99, status: 'stopped', url: undefined } : null
        );
      }
    } catch (e) {
      console.error('Failed to stop sandbox:', e);
    }
  };

  const handleViewSandboxLogs = (sandbox: SandboxItem) => {
    setActiveDeployment({
      id: sandbox.id,
      repo: {
        id: Date.now(),
        name: sandbox.repoName,
        fullName: sandbox.repoName,
        isPrivate: false,
        url: sandbox.repoUrl || 'uploaded-project',
        description: '',
        updatedAt: sandbox.createdAt,
      },
      step: sandbox.step || (sandbox.status === 'live' ? 4 : 1),
      status: sandbox.status,
      url: sandbox.url || undefined,
      logs: sandbox.logs || [`[Info] Connected to logs for sandbox ${sandbox.id}`],
      expiresAt: sandbox.expiresAt,
      detectedEnv: sandbox.detectedEnv,
    });
  };

  const activeLiveCount = sandboxes.filter(
    (s) => s.status === 'live' || s.status === 'cloning' || s.status === 'installing' || s.status === 'building' || s.status === 'starting' || s.status === 'unpacking'
  ).length;

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
            padding: '32px 24px',
            boxSizing: 'border-box',
          }}
        >
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Profile & Navigation Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #1a1a1a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      border: '1px solid #2a2a2a',
                    }}
                  />
                  <div>
                    <h2
                      style={{
                        fontSize: '16px',
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

                {/* Main Tabs: Deploy Project vs Live Websites */}
                <div
                  style={{
                    display: 'flex',
                    background: '#101010',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '4px',
                    gap: '4px',
                  }}
                >
                  <button
                    onClick={() => {
                      setMainTab('deploy');
                      setActiveDeployment(null);
                    }}
                    style={{
                      background: mainTab === 'deploy' && !activeDeployment ? '#242424' : 'transparent',
                      color: mainTab === 'deploy' && !activeDeployment ? '#fff' : '#888',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>🚀</span>
                    <span>Import & Deploy</span>
                  </button>

                  <button
                    onClick={() => {
                      setMainTab('live');
                      setActiveDeployment(null);
                      fetchSandboxes();
                    }}
                    style={{
                      background: mainTab === 'live' && !activeDeployment ? '#242424' : 'transparent',
                      color: mainTab === 'live' && !activeDeployment ? '#fff' : '#888',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: activeLiveCount > 0 ? '#10b981' : '#6b7280',
                        boxShadow: activeLiveCount > 0 ? '0 0 8px #10b981' : 'none',
                      }}
                    />
                    <span>Live Websites</span>
                    <span
                      style={{
                        background: mainTab === 'live' && !activeDeployment ? '#fff' : '#1e1e1e',
                        color: mainTab === 'live' && !activeDeployment ? '#000' : '#aaa',
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: 700,
                      }}
                    >
                      {activeLiveCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Main Tab Views */}
              {activeDeployment ? (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <button
                      onClick={() => setActiveDeployment(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ← Back to Workspace
                    </button>
                  </div>
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
                </div>
              ) : mainTab === 'live' ? (
                <LiveWebsitesTab
                  sandboxes={sandboxes}
                  loading={fetchingSandboxes}
                  onRefresh={fetchSandboxes}
                  onStop={handleStopSandboxFromTab}
                  onViewLogs={handleViewSandboxLogs}
                  onGoToDeploy={() => setMainTab('deploy')}
                />
              ) : (
                /* Deploy Project Area */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Sub-tabs: Git vs Local Folder */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderBottom: '1px solid #1c1c1c',
                      paddingBottom: '12px',
                    }}
                  >
                    <button
                      onClick={() => setDeployMode('git')}
                      style={{
                        background: deployMode === 'git' ? '#fff' : '#141414',
                        color: deployMode === 'git' ? '#000' : '#888',
                        border: '1px solid #282828',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🐙</span> GitHub Repository
                    </button>

                    <button
                      onClick={() => setDeployMode('folder')}
                      style={{
                        background: deployMode === 'folder' ? '#fff' : '#141414',
                        color: deployMode === 'folder' ? '#000' : '#888',
                        border: '1px solid #282828',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📁</span> Upload Local Folder / .ZIP
                    </button>
                  </div>

                  {deployMode === 'git' ? (
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
                  ) : (
                    <FolderUpload
                      onDeployFiles={handleDeployFiles}
                      isDeploying={isUploading}
                    />
                  )}
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
                Connect your GitHub account or upload local code directly to deploy,
                run sandboxes, and preview your websites in isolated environments.
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
