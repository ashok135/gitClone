import React from 'react';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
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
          onClick={onDismiss}
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
  );
};
