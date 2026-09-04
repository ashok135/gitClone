import { useState, useRef, useEffect } from 'react';
import type { Repo } from './ImportRepo';

export interface DetectedEnv {
  file: string;
  keys: string[];
  template?: string;
}

export interface DeploymentProgressProps {
  repo: Repo;
  step: number; // 0=Idle, 1=Cloning, 2=Installing, 3=Starting, 4=Live, <0=Failed, -99=Terminated
  status?: string;
  onBack: () => void;
  logs?: string[];
  url?: string;
  error?: string;
  expiresAt?: string;
  detectedEnv?: DetectedEnv;
  onStop?: () => Promise<void> | void;
}

type StepStatus = 'idle' | 'active' | 'done' | 'failed';

function StepRow({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: StepStatus;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Step indicator circle */}
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            flexShrink: 0,
            ...(status === 'done'
              ? { background: '#16a34a', color: '#fff' }
              : status === 'failed'
              ? { background: '#dc2626', color: '#fff' }
              : status === 'active'
              ? { background: '#3f3f3f', color: '#aaa', border: '1.5px solid #555' }
              : { background: '#1a1a1a', color: '#444', border: '1.5px solid #222' }),
          }}
        >
          {status === 'done' ? (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status === 'failed' ? (
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>✕</span>
          ) : status === 'active' ? (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: '1.5px solid #888',
                borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          ) : (
            <span>{index}</span>
          )}
        </div>

        <span
          style={{
            fontSize: '13px',
            fontWeight: status !== 'idle' ? '500' : '400',
            color:
              status === 'done'
                ? '#e4e4e4'
                : status === 'active'
                ? '#e4e4e4'
                : status === 'failed'
                ? '#f87171'
                : '#444',
          }}
        >
          {label}
        </span>
      </div>

      {/* Status badge */}
      {status === 'active' && (
        <span
          style={{
            fontSize: '11px',
            color: '#888',
            fontWeight: '500',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          In Progress
        </span>
      )}
      {status === 'done' && (
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
          Done
        </span>
      )}
      {status === 'failed' && (
        <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '600' }}>
          Failed
        </span>
      )}
    </div>
  );
}

const STEPS = [
  'Cloning repository',
  'Compiling sandbox bundle',
  'Spawning sandbox instance',
];

export function DeploymentProgress({
  repo,
  step,
  status,
  onBack,
  logs = [],
  url,
  error,
  expiresAt,
  detectedEnv,
  onStop,
}: DeploymentProgressProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showEnvTemplate, setShowEnvTemplate] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isTerminated = step === -99 || status === 'stopped' || status === 'expired';
  const isFailed = (step < 0 && !isTerminated) || !!error;
  const isLive = step >= 4 && !isFailed && !isTerminated;
  const progress = isFailed || isTerminated ? 100 : Math.min((Math.max(step, 0) / 4) * 100, 100);

  // Real-time ticking countdown to show exactly when the sandbox will end
  useEffect(() => {
    if (!expiresAt) return;
    const calculateTime = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((end - now) / 1000));
      if (diffSecs <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setTimeLeft(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const getStepStatus = (stepIndex: number): StepStatus => {
    if (isTerminated) return 'idle';
    if (isFailed) {
      if (stepIndex === Math.abs(step)) return 'failed';
      if (stepIndex < Math.abs(step)) return 'done';
      return 'idle';
    }
    if (step > stepIndex) return 'done';
    if (step === stepIndex) return 'active';
    return 'idle';
  };

  const formatLiveUrl = (rawUrl?: string): string => {
    if (!rawUrl) {
      return `https://${repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-sandbox.vercel.app`;
    }
    let cleaned = rawUrl.trim();
    // Strip duplicate protocols like http://http:// or http://https://
    while (/^https?:\/\/https?:\/\//i.test(cleaned)) {
      cleaned = cleaned.replace(/^https?:\/\//i, '');
    }
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = `http://${cleaned}`;
    }
    return cleaned;
  };

  const sandboxUrl = formatLiveUrl(url);

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid #1f1f1f',
        background: '#0a0a0a',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span
            style={{
              fontSize: '11px',
              color: '#555',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            Deployment Status
          </span>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: '4px 0 0 0' }}>
            {repo.name}
          </h3>
        </div>

        {/* Live / Terminated / Building / Failed badge */}
        {isTerminated ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #333',
              borderRadius: '999px',
              padding: '5px 12px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#888',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#ccc' }}>
              {status === 'expired' ? 'Auto-Expired & Cleaned' : 'Stopped & Cleaned'}
            </span>
          </div>
        ) : isLive ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(22,163,74,0.1)',
              border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: '999px',
              padding: '5px 12px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#16a34a',
                display: 'inline-block',
                animation: 'ping 1.2s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#4ade80' }}>
              Live
            </span>
          </div>
        ) : isFailed ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '999px',
              padding: '5px 12px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#f87171' }}>
              Failed
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '999px',
              padding: '5px 12px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#888',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#888' }}>
              Building Sandbox…
            </span>
          </div>
        )}
      </div>

      {/* Error message banner */}
      {isFailed && error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#f87171',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step rows */}
      <div>
        {STEPS.map((label, idx) => (
          <StepRow
            key={label}
            index={idx + 1}
            label={label}
            status={getStepStatus(idx + 1)}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#555' }}>Progress</span>
          <span style={{ fontSize: '11px', color: '#555' }}>
            {isFailed ? 'Error' : `${Math.round(progress)}%`}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '999px',
            background: '#1a1a1a',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              background: isFailed
                ? '#ef4444'
                : isLive
                ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                : 'linear-gradient(90deg, #aaa, #fff)',
              width: `${progress}%`,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      {/* Live Deployment Card */}
      {isLive && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid #1a2e1a',
            background: 'rgba(22,163,74,0.05)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: '11px',
                  color: '#555',
                  margin: '0 0 4px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Live Sandbox URL
              </p>
              <a
                href={sandboxUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '14px',
                  color: '#4ade80',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')
                }
              >
                <span>{sandboxUrl}</span>
                <span style={{ fontSize: '12px' }}>↗</span>
              </a>
            </div>

            {/* Option 2: Auto-expire TTL pill with live countdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.25)',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#4ade80',
                fontWeight: '600',
              }}
              title={expiresAt ? `Expires at ${new Date(expiresAt).toLocaleTimeString()}` : 'Auto-expires in 60 minutes to reclaim VM disk'}
            >
              <span>⏳</span>
              <span>
                {timeLeft
                  ? `Live · Expires in ${timeLeft}`
                  : expiresAt
                  ? `Expires: ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'TTL: 60m Auto-Clean'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p
                style={{
                  fontSize: '11px',
                  color: '#555',
                  margin: '0 0 4px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Branch & Source
              </p>
              <span style={{ fontSize: '13px', color: '#aaa' }}>main • {repo.fullName}</span>
            </div>

            {/* Option 3: Stop & Delete Sandbox button */}
            <div>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  🛑 Stop & Delete Sandbox
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={stopping}
                    onClick={async () => {
                      setStopping(true);
                      try {
                        if (onStop) await onStop();
                      } finally {
                        setStopping(false);
                        setConfirmDelete(false);
                      }
                    }}
                    style={{
                      background: '#ef4444',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: stopping ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {stopping ? 'Stopping...' : 'Confirm: Free Port & Delete Disk'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      color: '#aaa',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE LIVE WEBSITE PREVIEW FRAME */}
      {/* ---------------------------------------------------- */}
      {isLive && (
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #222',
            background: '#0d0d0d',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Browser Chrome Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#141414',
              borderBottom: '1px solid #222',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Window Controls & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '6px', fontWeight: '600' }}>
                Live Sandbox Viewport
              </span>
            </div>

            {/* Address Bar */}
            <div
              style={{
                flex: '1',
                maxWidth: '520px',
                minWidth: '220px',
                display: 'flex',
                alignItems: 'center',
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                color: '#4ade80',
                gap: '8px',
              }}
            >
              <span style={{ color: '#22c55e', fontSize: '11px' }}>🔒</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {sandboxUrl}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sandboxUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedUrl ? '#4ade80' : '#777',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
                title="Copy URL"
              >
                {copiedUrl ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Controls: Reload, Device Switcher, Open External */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Reload Button */}
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                style={{
                  background: '#202020',
                  border: '1px solid #333',
                  color: '#ccc',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                title="Refresh Sandbox View"
              >
                🔄 Reload
              </button>

              {/* Viewport switcher */}
              <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  style={{
                    background: viewport === 'desktop' ? '#262626' : 'transparent',
                    border: 'none',
                    color: viewport === 'desktop' ? '#fff' : '#777',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                  title="Desktop View (100%)"
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  style={{
                    background: viewport === 'tablet' ? '#262626' : 'transparent',
                    border: 'none',
                    color: viewport === 'tablet' ? '#fff' : '#777',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                  title="Tablet View (768px)"
                >
                  💻 Tablet
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  style={{
                    background: viewport === 'mobile' ? '#262626' : 'transparent',
                    border: 'none',
                    color: viewport === 'mobile' ? '#fff' : '#777',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                  title="Mobile View (375px)"
                >
                  📱 Mobile
                </button>
              </div>

              {/* Open in New Tab */}
              <a
                href={sandboxUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#16a34a',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Open Tab ↗
              </a>
            </div>
          </div>

          {/* Iframe Viewport Area */}
          <div
            style={{
              width: '100%',
              minHeight: '620px',
              background: '#080808',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              padding: viewport === 'desktop' ? '0' : '24px 0',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%',
                maxWidth: '100%',
                height: '620px',
                borderRadius: viewport === 'desktop' ? '0' : '12px',
                overflow: 'hidden',
                boxShadow: viewport === 'desktop' ? 'none' : '0 15px 40px rgba(0,0,0,0.9)',
                border: viewport === 'desktop' ? 'none' : '2px solid #333',
                background: '#fff',
                transition: 'width 0.3s ease',
              }}
            >
              <iframe
                key={iframeKey}
                src={sandboxUrl}
                title="Live Sandbox View"
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

      {/* ---------------------------------------------------- */}
      {/* ENVIRONMENT SETUP (.env) INSPECTOR CARD */}
      {/* ---------------------------------------------------- */}
      {isLive && (
        <div
          style={{
            borderRadius: '10px',
            border: '1px solid #222',
            background: '#0d0d0d',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚙️</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                Environment & Runtime Configuration (.env)
              </span>
            </div>
            {detectedEnv?.keys && detectedEnv.keys.length > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  color: '#4ade80',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontWeight: '600',
                }}
              >
                ✓ {detectedEnv.keys.length} Variable(s) Configured
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: '#888' }}>
                ✓ Self-contained build (No custom .env required)
              </span>
            )}
          </div>

          {detectedEnv?.keys && detectedEnv.keys.length > 0 ? (
            <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>
                This repository includes a <strong style={{ color: '#fff' }}>{detectedEnv.file}</strong> template. The sandbox initialized default values for:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detectedEnv.keys.map((k) => (
                  <span
                    key={k}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#60a5fa',
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
              {detectedEnv.template && (
                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowEnvTemplate(!showEnvTemplate)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '0',
                      textDecoration: 'underline',
                    }}
                  >
                    {showEnvTemplate ? 'Hide detected .env template ▲' : 'View detected .env template ▼'}
                  </button>
                  {showEnvTemplate && (
                    <pre
                      style={{
                        marginTop: '8px',
                        background: '#050505',
                        border: '1px solid #222',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '11px',
                        color: '#93c5fd',
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                      }}
                    >
                      {detectedEnv.template}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: '#777' }}>
              Standard production bundle was built cleanly without missing environment variables.
            </p>
          )}
        </div>
      )}

      {/* Terminated State Card */}
      {isTerminated && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid #222',
            background: 'rgba(255,255,255,0.02)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧹</span>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>
              {status === 'expired' ? 'Sandbox Auto-Expired' : 'Sandbox Terminated & Disk Cleaned'}
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: '1.5' }}>
            The preview server was stopped, the isolated port was freed, and the cloned directory was permanently deleted from your Oracle VM disk.
          </p>
          <button
            type="button"
            onClick={onBack}
            style={{
              alignSelf: 'flex-start',
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            ← Back to Repositories
          </button>
        </div>
      )}

      {/* Live Logs Terminal Viewer */}
      <div
        style={{
          borderRadius: '8px',
          border: '1px solid #1c1c1c',
          background: '#050505',
          overflow: 'hidden',
        }}
      >
        <div
          onClick={() => setShowLogs(!showLogs)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#0d0d0d',
            borderBottom: showLogs ? '1px solid #1c1c1c' : 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#ccc',
                fontFamily: 'monospace',
              }}
            >
              Build & Runtime Logs ({logs.length})
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {showLogs ? 'Collapse ▲' : 'Expand ▼'}
          </span>
        </div>

        {showLogs && (
          <div
            style={{
              padding: '12px 14px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11.5px',
              lineHeight: '1.6',
              color: '#a1a1aa',
            }}
          >
            {logs.length === 0 ? (
              <p style={{ margin: 0, color: '#444' }}>Waiting for server output…</p>
            ) : (
              logs.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    wordBreak: 'break-word',
                    color:
                      line.startsWith('❌') || line.includes('Error')
                        ? '#f87171'
                        : line.startsWith('✓')
                        ? '#4ade80'
                        : line.startsWith('$')
                        ? '#93c5fd'
                        : '#a1a1aa',
                  }}
                >
                  {line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            color: '#888',
            border: '1px solid #2a2a2a',
            borderRadius: '7px',
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#555';
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a';
            (e.currentTarget as HTMLButtonElement).style.color = '#888';
          }}
          onMouseDown={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)')
          }
          onMouseUp={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
          }
        >
          ← Back to Repositories
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
