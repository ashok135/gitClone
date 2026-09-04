import React, { useState, useEffect } from 'react';
import type { SandboxItem } from '../types/sandbox';
import { SandboxCard } from './live/SandboxCard';
import { ViewportModal } from './live/ViewportModal';
import { RotateCw, Globe, Rocket } from 'lucide-react';

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
  const [stoppingId, setStoppingId] = useState<string | null>(null);
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

  const handleStopClick = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to stop this sandbox? This will kill the preview server and wipe files from VM disk.'
      )
    ) {
      return;
    }
    setStoppingId(id);
    try {
      await onStop(id);
    } finally {
      setStoppingId(null);
    }
  };

  const activeSandboxes = sandboxes.filter((s) => {
    const isExpired = s.expiresAt && new Date(s.expiresAt).getTime() < Date.now();
    if (isExpired) return false;
    if (s.status === 'live') {
      return Boolean(s.port || s.url);
    }
    return (
      s.status === 'cloning' ||
      s.status === 'installing' ||
      s.status === 'building' ||
      s.status === 'starting' ||
      s.status === 'unpacking'
    );
  });

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
              Isolated preview servers running inside your cloud sandbox VM
            </p>
          </div>
        </div>

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
          <RotateCw
            size={13}
            style={{
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
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
            }}
          >
            <Globe size={24} color="#666" />
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#eee',
                marginBottom: '4px',
              }}
            >
              No Live Websites Currently Running
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#666',
                maxWidth: '420px',
                margin: '0 auto',
              }}
            >
              Deploy a GitHub repository or upload a local project folder to launch an
              isolated preview website on your VM.
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Rocket size={14} />
            <span>Deploy a Project Now</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {activeSandboxes.map((sandbox) => (
            <SandboxCard
              key={sandbox.id}
              sandbox={sandbox}
              timeLeft={formatCountdown(sandbox.expiresAt)}
              onInspect={(url) => setInspectUrl(url)}
              onViewLogs={onViewLogs}
              onStop={handleStopClick}
              stopping={stoppingId === sandbox.id}
            />
          ))}
        </div>
      )}

      {/* Inspector Viewport Modal */}
      <ViewportModal url={inspectUrl} onClose={() => setInspectUrl(null)} />
    </div>
  );
};
