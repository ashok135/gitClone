import React, { useState, useEffect } from 'react';

export interface SandboxItem {
  id: string;
  repoName: string;
  repoUrl?: string;
  isUpload?: boolean;
  status: string;
  step?: number;
  port?: number;
  url?: string | null;
  createdAt: string;
  expiresAt?: string;
  ttlMinutes?: number;
  detectedEnv?: {
    file: string;
    keys: string[];
  };
  logs?: string[];
}

interface LiveWebsitesTabProps {
  sandboxes: SandboxItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onViewLogs: (sandbox: SandboxItem) => void;
  onGoToDeploy: () => void;
}

export const LiveWebsitesTab: React.FC<LiveWebsitesTabProps> = ({
  sandboxes,
  loading,
  onRefresh,
  onStop,
  onViewLogs,
  onGoToDeploy,
}) => {
  const [inspectUrl, setInspectUrl] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());

  // Ticking timer for real-time countdown updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStopClick = async (id: string) => {
    if (!confirm('Are you sure you want to stop this sandbox? This will kill the server process and wipe files from VM disk.')) {
      return;
    }
    setStoppingId(id);
    try {
      await onStop(id);
    } finally {
      setStoppingId(null);
    }
  };

  const activeSandboxes = sandboxes.filter(
    (s) => s.status === 'live' || s.status === 'cloning' || s.status === 'installing' || s.status === 'building' || s.status === 'starting' || s.status === 'unpacking'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0d0d0d',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: activeSandboxes.length > 0 ? '#10b981' : '#6b7280',
              boxShadow: activeSandboxes.length > 0 ? '0 0 10px #10b981' : 'none',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
              Active Sandbox Deployments
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
              Isolated server processes running inside your cloud sandbox VM
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: '#161616',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              color: '#bbb',
              fontSize: '12px',
              padding: '6px 12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>
              ↻
            </span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Sandboxes list */}
      {activeSandboxes.length === 0 ? (
        <div
          style={{
            background: '#0a0a0a',
            border: '1px dashed #222',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#141414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            🌐
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#eee', marginBottom: '4px' }}>
              No Live Websites Currently Running
            </div>
            <div style={{ fontSize: '13px', color: '#666', maxWidth: '420px', margin: '0 auto' }}>
              Deploy a GitHub repository or upload a local project folder to launch an isolated preview website on your VM.
            </div>
          </div>
          <button
            onClick={onGoToDeploy}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '6px',
            }}
          >
            🚀 Deploy a Project Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {activeSandboxes.map((sandbox) => {
            const timeLeft = formatCountdown(sandbox.expiresAt);
            const isLive = sandbox.status === 'live';

            return (
              <div
                key={sandbox.id}
                style={{
                  background: '#0d0d0d',
                  border: '1px solid #222',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#333')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#222')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#161616',
                        border: '1px solid #262626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {sandbox.isUpload ? '📁' : '🐙'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                          {sandbox.repoName}
                        </h4>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: sandbox.isUpload ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)',
                            color: sandbox.isUpload ? '#c084fc' : '#60a5fa',
                            border: `1px solid ${sandbox.isUpload ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {sandbox.isUpload ? 'Folder Upload' : 'Git Repo'}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: isLive ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isLive ? '#10b981' : '#f59e0b',
                            }}
                          />
                          {sandbox.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#666' }}>
                        <span>ID: {sandbox.id}</span>
                        {sandbox.port && <span>Port: {sandbox.port}</span>}
                        <span>Created: {new Date(sandbox.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expiration badge */}
                  {timeLeft && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        color: '#fbbf24',
                      }}
                      title="Option 2: Sandbox automatically frees VM resources when countdown reaches 0"
                    >
                      <span>⏳</span>
                      <span>Expires in: <strong>{timeLeft}</strong></span>
                    </div>
                  )}
                </div>

                {/* URL Bar if Live */}
                {isLive && sandbox.url && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#111',
                      border: '1px solid #222',
                      borderRadius: '8px',
                      padding: '8px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', color: '#10b981' }}>●</span>
                      <a
                        href={sandbox.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#60a5fa',
                          textDecoration: 'none',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sandbox.url}
                      </a>
                    </div>

                    <button
                      onClick={() => handleCopy(sandbox.id, sandbox.url!)}
                      style={{
                        background: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#ccc',
                        fontSize: '11px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedId === sandbox.id ? '✓ Copied' : 'Copy URL'}
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #1a1a1a', paddingTop: '12px' }}>
                  {isLive && sandbox.url && (
                    <>
                      <a
                        href={sandbox.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#fff',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        ↗ Open Website
                      </a>

                      <button
                        onClick={() => setInspectUrl(sandbox.url!)}
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        📱 Inspect Viewport
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onViewLogs(sandbox)}
                    style={{
                      background: '#141414',
                      border: '1px solid #2a2a2a',
                      color: '#bbb',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    📋 View Build Logs
                  </button>

                  <button
                    onClick={() => handleStopClick(sandbox.id)}
                    disabled={stoppingId === sandbox.id}
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: stoppingId === sandbox.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {stoppingId === sandbox.id ? 'Stopping...' : '🛑 Terminate & Clean VM'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Viewport Modal */}
      {inspectUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                Live Website Inspector
              </h3>
              {/* Device switcher */}
              <div
                style={{
                  display: 'flex',
                  background: '#161616',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  padding: '2px',
                }}
              >
                {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDeviceMode(mode)}
                    style={{
                      background: deviceMode === mode ? '#333' : 'transparent',
                      color: deviceMode === mode ? '#fff' : '#888',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode === 'desktop' ? '🖥️ Desktop' : mode === 'tablet' ? '📱 Tablet' : '📲 Mobile'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href={inspectUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#60a5fa',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Open in new tab ↗
              </a>
              <button
                onClick={() => setInspectUrl(null)}
                style={{
                  background: '#222',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Viewport Frame */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width:
                  deviceMode === 'desktop'
                    ? '100%'
                    : deviceMode === 'tablet'
                    ? '768px'
                    : '375px',
                height: deviceMode === 'desktop' ? '100%' : deviceMode === 'tablet' ? '90%' : '667px',
                maxHeight: '100%',
                background: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                border: '1px solid #333',
                transition: 'width 0.3s ease',
              }}
            >
              <iframe
                src={inspectUrl}
                title="Live Sandbox Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
