import React, { useState } from 'react';
import type { SandboxItem } from '../../types/sandbox';
import {
  FolderArchive,
  GitBranch,
  Clock,
  ExternalLink,
  MonitorSmartphone,
  Terminal,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

interface SandboxCardProps {
  sandbox: SandboxItem;
  timeLeft: string | null;
  onInspect: (url: string) => void;
  onViewLogs: (sandbox: SandboxItem) => void;
  onStop: (id: string) => void;
  stopping: boolean;
}

export const SandboxCard: React.FC<SandboxCardProps> = ({
  sandbox,
  timeLeft,
  onInspect,
  onViewLogs,
  onStop,
  stopping,
}) => {
  const [copied, setCopied] = useState(false);
  const isLive = sandbox.status === 'live';

  const getPublicUrl = (): string | null => {
    let target = sandbox.url;
    if (!target && sandbox.port) {
      target = `http://129.225.66.172:${sandbox.port}`;
    }
    if (target) {
      try {
        const parsed = new URL(target);
        if (
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname.includes('vercel.app')
        ) {
          return `http://129.225.66.172:${parsed.port || sandbox.port || 4001}`;
        }
        return target;
      } catch {}
    }
    return target || null;
  };

  const liveUrl = getPublicUrl();

  const handleCopy = () => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName =
    sandbox.repoName && !sandbox.repoName.startsWith('dep_')
      ? sandbox.repoName
      : sandbox.repoUrl && sandbox.repoUrl !== 'local-upload'
      ? sandbox.repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'Git Project'
      : `Project ${sandbox.id.replace(/^dep_/, '').slice(-4)}`;

  return (
    <div
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
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
            }}
          >
            {sandbox.isUpload ? (
              <FolderArchive size={18} color="#c084fc" />
            ) : (
              <GitBranch size={18} color="#60a5fa" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                {displayName}
              </h4>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: sandbox.isUpload
                    ? 'rgba(168,85,247,0.15)'
                    : 'rgba(59,130,246,0.15)',
                  color: sandbox.isUpload ? '#c084fc' : '#60a5fa',
                  border: `1px solid ${
                    sandbox.isUpload ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)'
                  }`,
                  textTransform: 'uppercase',
                }}
              >
                {sandbox.isUpload ? 'Folder Upload' : 'Git Repo'}
              </span>

              {sandbox.rootDir && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99,102,241,0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.3)',
                    fontFamily: 'monospace',
                  }}
                >
                  /{sandbox.rootDir}
                </span>
              )}

              {sandbox.isBackend && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(234,88,12,0.15)',
                    color: '#fb923c',
                    border: '1px solid rgba(234,88,12,0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Backend API
                </span>
              )}

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: isLive ? '#34d399' : '#fbbf24',
                  border: `1px solid ${
                    isLive ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'
                  }`,
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '4px',
                fontSize: '11px',
                color: '#666',
              }}
            >
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
          >
            <Clock size={13} color="#fbbf24" />
            <span>
              Expires in: <strong>{timeLeft}</strong>
            </span>
          </div>
        )}
      </div>

      {/* URL Bar if Live */}
      {isLive && liveUrl && (
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            <a
              href={liveUrl}
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
              {liveUrl}
            </a>
          </div>

          <button
            onClick={handleCopy}
            style={{
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#ccc',
              fontSize: '11px',
              padding: '4px 8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          borderTop: '1px solid #1a1a1a',
          paddingTop: '12px',
        }}
      >
        {isLive && liveUrl && (
          <>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: sandbox.isBackend ? '#ea580c' : '#fff',
                color: sandbox.isBackend ? '#fff' : '#000',
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
              <ExternalLink size={13} />
              <span>{sandbox.isBackend ? 'Open API Endpoint ↗' : 'Open Website'}</span>
            </a>

            {!sandbox.isBackend && (
              <button
                onClick={() => onInspect(liveUrl)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = '#252525')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a')
                }
              >
                <MonitorSmartphone size={13} color="#bbb" />
                <span>Inspect Viewport</span>
              </button>
            )}
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Terminal size={13} />
          <span>View Build Logs</span>
        </button>

        <button
          onClick={() => onStop(sandbox.id)}
          disabled={stopping}
          style={{
            marginLeft: 'auto',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: stopping ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Trash2 size={13} />
          <span>{stopping ? 'Stopping...' : 'Terminate & Clean VM'}</span>
        </button>
      </div>
    </div>
  );
};
