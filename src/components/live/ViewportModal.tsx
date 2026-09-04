import React, { useState } from 'react';

interface ViewportModalProps {
  url: string | null;
  onClose: () => void;
}

export const ViewportModal: React.FC<ViewportModalProps> = ({ url, onClose }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!url) return null;

  return (
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
      {/* Header */}
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
            href={url}
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
            onClick={onClose}
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
            height:
              deviceMode === 'desktop'
                ? '100%'
                : deviceMode === 'tablet'
                ? '90%'
                : '667px',
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
            src={url}
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
  );
};
