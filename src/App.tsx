import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGithubRepos } from './hooks/useGithubRepos';
import { useSandboxes } from './hooks/useSandboxes';
import { useActiveDeployment } from './hooks/useActiveDeployment';

import { Navbar } from './components/Navbar';
import { ErrorBanner } from './components/common/ErrorBanner';
import { LoadingScreen } from './components/common/LoadingScreen';
import { HeroLoggedOut } from './components/common/HeroLoggedOut';
import { WorkspaceHeader } from './components/workspace/WorkspaceHeader';
import { NavigationTabs } from './components/workspace/NavigationTabs';
import { DeploySubTabs } from './components/workspace/DeploySubTabs';
import { ImportRepo } from './components/ImportRepo';
import { LinkImport } from './components/LinkImport';
import { FolderUpload } from './components/FolderUpload';
import { LiveWebsitesTab } from './components/LiveWebsitesTab';
import { DeploymentProgress } from './components/DeploymentProgress';

import { Globe } from 'lucide-react';
import type { Repo } from './types/repo';

function App() {
  const { user, loading, error, setError, login, logout } = useAuth();
  const [mainTab, setMainTab] = useState<'deploy' | 'live'>(() => {
    try {
      const saved = localStorage.getItem('mini_vercel_active_tab');
      return saved === 'live' ? 'live' : 'deploy';
    } catch {
      return 'deploy';
    }
  });
  const [deployMode, setDeployMode] = useState<'git' | 'folder'>('git');

  // Sandboxes management hook
  const {
    sandboxes,
    activeCount,
    fetching: fetchingSandboxes,
    refreshSandboxes,
    recordSandbox,
    stopSandbox,
  } = useSandboxes();

  // Active build & deployment hook
  const {
    activeDeployment,
    setActiveDeployment,
    isDeployingFiles,
    startGitDeploy,
    startFilesDeploy,
    stopCurrentDeploy,
    viewSandboxLogs,
  } = useActiveDeployment({
    onSandboxUpdate: recordSandbox,
  });

  // GitHub repositories hook
  const {
    repos,
    fetchingRepos,
    searchQuery,
    setSearchQuery,
    customRepoUrl,
    setCustomRepoUrl,
    markAsImported,
  } = useGithubRepos(user);

  const handleGitImport = async (
    repo: Repo,
    rootDir?: string,
    projectType?: 'frontend' | 'backend' | 'auto'
  ) => {
    markAsImported(repo.id);
    await startGitDeploy(repo, undefined, rootDir, projectType);
  };

  const handleCustomGitImport = async (
    rootDir?: string,
    projectType?: 'frontend' | 'backend' | 'auto'
  ) => {
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
    await startGitDeploy(mockRepo, undefined, rootDir, projectType);
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

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {loading ? (
        <LoadingScreen />
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
              {/* Workspace Header & Top-level Navigation */}
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
                <WorkspaceHeader user={user} />
                <NavigationTabs
                  activeTab={mainTab}
                  onSelectTab={(tab) => {
                    setMainTab(tab);
                    try {
                      localStorage.setItem('mini_vercel_active_tab', tab);
                    } catch {}
                    setActiveDeployment(null);
                    if (tab === 'live') refreshSandboxes();
                  }}
                  activeCount={activeCount}
                />
              </div>

              {/* View 1: Active Deployment Process */}
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
                    onStop={stopCurrentDeploy}
                  />
                </div>
              ) : mainTab === 'live' ? (
                /* View 2: Live Websites Tab */
                <LiveWebsitesTab
                  sandboxes={sandboxes}
                  loading={fetchingSandboxes}
                  onRefresh={refreshSandboxes}
                  onStop={stopSandbox}
                  onViewLogs={viewSandboxLogs}
                  onGoToDeploy={() => {
                    setMainTab('deploy');
                    try {
                      localStorage.setItem('mini_vercel_active_tab', 'deploy');
                    } catch {}
                  }}
                />
              ) : (
                /* View 3: Deploy Project Area */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Alert banner if user has active sandboxes running while on Deploy tab */}
                  {activeCount > 0 && (
                    <div
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))',
                        border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: '10px',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: '#10b981',
                            boxShadow: '0 0 10px #10b981',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#e4e4e4', fontWeight: 500 }}>
                          You have <strong>{activeCount}</strong> live sandbox website
                          {activeCount > 1 ? 's' : ''} running right now.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setMainTab('live');
                          try {
                            localStorage.setItem('mini_vercel_active_tab', 'live');
                          } catch {}
                          refreshSandboxes();
                        }}
                        style={{
                          background: '#10b981',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Globe size={13} />
                        <span>View Live Websites →</span>
                      </button>
                    </div>
                  )}

                  <DeploySubTabs mode={deployMode} onSelectMode={setDeployMode} />

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
                        repos={repos}
                        fetchingRepos={fetchingRepos}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onImport={handleGitImport}
                      />
                      <LinkImport
                        customRepoUrl={customRepoUrl}
                        onUrlChange={setCustomRepoUrl}
                        onImport={handleCustomGitImport}
                      />
                    </div>
                  ) : (
                    <FolderUpload
                      onDeployFiles={startFilesDeploy}
                      isDeploying={isDeployingFiles}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <HeroLoggedOut onLogin={login} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
