import { useState, useRef, useEffect } from 'react';
import type { Repo } from './ImportRepo';

export interface DeploymentProgressProps {
  repo: Repo;
  step: number; // 0=Idle, 1=Cloning, 2=Building, 3=Starting, 4=Live, -1=Failed
  onBack: () => void;
  logs?: string[];
  url?: string;
  error?: string;
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
  onBack,
  logs = [],
  url,
  error,
}: DeploymentProgressProps) {
  const [showLogs, setShowLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isFailed = step === -1 || !!error;
  const isLive = step >= 4 && !isFailed;
  const progress = isFailed ? 100 : Math.min((Math.max(step, 0) / 4) * 100, 100);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const getStepStatus = (stepIndex: number): StepStatus => {
    if (isFailed) {
      if (stepIndex === Math.abs(step)) return 'failed';
      if (stepIndex < Math.abs(step)) return 'done';
      return 'idle';
    }
    if (step > stepIndex) return 'done';
    if (step === stepIndex) return 'active';
    return 'idle';
  };

  const sandboxUrl =
    url || `https://${repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-sandbox.vercel.app`;

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

        {/* Live / Building / Failed badge */}
        {isLive ? (
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
