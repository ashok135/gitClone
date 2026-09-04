import React, { useState } from 'react';
import {type SandboxItem } from '../../types/sandbox';

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

  const handleCopy = () => {
    if (!sandbox.url) return;
    navigator.clipboard.writeText(sandbox.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <span>⏳</span>
            <span>
              Expires in: <strong>{timeLeft}</strong>
            </span>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'hidden',
            }}
          >
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
            onClick={handleCopy}
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
            {copied ? '✓ Copied' : 'Copy URL'}
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
              onClick={() => onInspect(sandbox.url!)}
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
          }}
        >
          {stopping ? 'Stopping...' : '🛑 Terminate & Clean VM'}
        </button>
      </div>
    </div>
  );
};
